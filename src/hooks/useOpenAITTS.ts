
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  selectBestVoice, 
  VoiceSelectionResult 
} from '@/utils/voiceSelection';

interface OpenAITTSOptions {
  voice?: string;
  speed?: number;
  language?: string;
  enableFallback?: boolean;
}

interface TTSPlaybackResult {
  success: boolean;
  method: 'openai' | 'browser' | 'failed';
  voice?: string;
  error?: string;
  fallbackUsed?: boolean;
}

export const useOpenAITTS = (options: OpenAITTSOptions = {}) => {
  const {
    voice = 'nova',
    speed = 1.0,
    language = 'es',
    enableFallback = true
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMethod, setCurrentMethod] = useState<'openai' | 'browser' | null>(null);
  const [currentVoice, setCurrentVoice] = useState<string | null>(null);
  const [lastPlayedText, setLastPlayedText] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fallbackVoiceRef = useRef<VoiceSelectionResult | null>(null);

  // Clean up audio resources
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    
    setIsPlaying(false);
    setIsInitializing(false);
  }, []);

  // OpenAI TTS via Edge Function
  const playWithOpenAI = useCallback(async (text: string): Promise<TTSPlaybackResult> => {
    try {
      console.log('🎤 [OpenAI TTS] Starting playback with NOVA voice');
      
      const { data, error: functionError } = await supabase.functions.invoke('openai-tts', {
        body: {
          text,
          voice,
          speed,
          lang: language
        }
      });

      if (functionError || !data) {
        throw new Error(functionError?.message || 'Failed to call TTS function');
      }

      if (!data.success) {
        const shouldFallback = data.fallbackRequired;
        console.warn('🚨 [OpenAI TTS] Failed:', data.error, shouldFallback ? '(fallback enabled)' : '');
        
        if (shouldFallback && enableFallback) {
          return { success: false, method: 'failed', error: data.error, fallbackUsed: true };
        }
        
        throw new Error(data.error || 'TTS generation failed');
      }

      // Play the audio
      const audio = new Audio();
      audioRef.current = audio;
      
      return new Promise((resolve) => {
        audio.onloadeddata = () => {
          console.log('🔊 [OpenAI TTS] Audio loaded, starting playback');
          setCurrentMethod('openai');
          setCurrentVoice('NOVA (OpenAI)');
          setIsPlaying(true);
          setIsInitializing(false);
        };

        audio.onended = () => {
          console.log('✅ [OpenAI TTS] Playback completed');
          cleanup();
          resolve({ success: true, method: 'openai', voice: 'NOVA (OpenAI)' });
        };

        audio.onerror = (e) => {
          console.error('❌ [OpenAI TTS] Audio playback error:', e);
          cleanup();
          resolve({ 
            success: false, 
            method: 'failed', 
            error: 'Audio playback failed',
            fallbackUsed: enableFallback
          });
        };

        // Set audio source and play
        audio.src = `data:audio/mp3;base64,${data.audioData}`;
        audio.play().catch((playError) => {
          console.error('❌ [OpenAI TTS] Play failed:', playError);
          cleanup();
          resolve({ 
            success: false, 
            method: 'failed', 
            error: playError.message,
            fallbackUsed: enableFallback
          });
        });
      });

    } catch (error) {
      console.error('❌ [OpenAI TTS] Error:', error);
      return { 
        success: false, 
        method: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: enableFallback
      };
    }
  }, [voice, speed, language, enableFallback, cleanup]);

  // Browser TTS fallback
  const playWithBrowser = useCallback(async (text: string): Promise<TTSPlaybackResult> => {
    try {
      console.log('🗣️ [Browser TTS] Starting fallback playback');
      
      // Get the best available voice
      if (!fallbackVoiceRef.current) {
        fallbackVoiceRef.current = await selectBestVoice({
          preferredLanguage: language,
          requireSpanish: false,
          requireFemale: false,
          allowFallback: true
        });
      }

      const voiceResult = fallbackVoiceRef.current;
      
      if (!voiceResult.voice) {
        throw new Error('No voices available for fallback TTS');
      }

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        
        utterance.voice = voiceResult.voice;
        utterance.rate = speed;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        utterance.lang = language;

        utterance.onstart = () => {
          console.log(`🎵 [Browser TTS] Started with ${voiceResult.name} (Tier ${voiceResult.tier})`);
          setCurrentMethod('browser');
          setCurrentVoice(voiceResult.name);
          setIsPlaying(true);
          setIsInitializing(false);
        };

        utterance.onend = () => {
          console.log('✅ [Browser TTS] Playback completed');
          cleanup();
          resolve({ 
            success: true, 
            method: 'browser', 
            voice: voiceResult.name,
            fallbackUsed: true
          });
        };

        utterance.onerror = (e) => {
          console.error('❌ [Browser TTS] Error:', e.error);
          cleanup();
          resolve({ 
            success: false, 
            method: 'failed', 
            error: `Browser TTS failed: ${e.error}`,
            fallbackUsed: true
          });
        };

        window.speechSynthesis.speak(utterance);
      });

    } catch (error) {
      console.error('❌ [Browser TTS] Error:', error);
      return { 
        success: false, 
        method: 'failed', 
        error: error instanceof Error ? error.message : 'Browser TTS failed'
      };
    }
  }, [language, speed, cleanup]);

  // Main speak function with fallback logic
  const speak = useCallback(async (text: string): Promise<TTSPlaybackResult> => {
    if (!text?.trim()) {
      return { success: false, method: 'failed', error: 'No text provided' };
    }

    // Clean up any existing playback
    cleanup();
    
    setIsInitializing(true);
    setError(null);
    setLastPlayedText(text);

    console.log('🎯 [Universal TTS] Starting playback with OpenAI NOVA primary, browser fallback');

    try {
      // Try OpenAI TTS first
      const openaiResult = await playWithOpenAI(text);
      
      if (openaiResult.success) {
        console.log('✅ [Universal TTS] OpenAI TTS succeeded');
        return openaiResult;
      }

      // If OpenAI failed and fallback is enabled, try browser TTS
      if (enableFallback && openaiResult.fallbackUsed) {
        console.log('🔄 [Universal TTS] Falling back to browser TTS');
        const browserResult = await playWithBrowser(text);
        
        if (browserResult.success) {
          console.log('✅ [Universal TTS] Browser TTS fallback succeeded');
          return browserResult;
        }
        
        // Both failed
        const errorMessage = `Both OpenAI and browser TTS failed. OpenAI: ${openaiResult.error}, Browser: ${browserResult.error}`;
        setError(errorMessage);
        return { success: false, method: 'failed', error: errorMessage };
      }

      // Only OpenAI attempted, fallback disabled
      setError(openaiResult.error || 'TTS failed');
      return openaiResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
      console.error('❌ [Universal TTS] Unexpected error:', error);
      setError(errorMessage);
      cleanup();
      return { success: false, method: 'failed', error: errorMessage };
    }
  }, [playWithOpenAI, playWithBrowser, enableFallback, cleanup]);

  // Stop current playback
  const stop = useCallback(() => {
    console.log('🛑 [Universal TTS] Stopping playback');
    cleanup();
  }, [cleanup]);

  // Replay last message
  const replay = useCallback(async (): Promise<TTSPlaybackResult | null> => {
    if (!lastPlayedText) {
      console.warn('⚠️ [Universal TTS] No text to replay');
      return null;
    }
    
    console.log('🔄 [Universal TTS] Replaying last message');
    return await speak(lastPlayedText);
  }, [lastPlayedText, speak]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    speak,
    stop,
    replay,
    isPlaying,
    isInitializing,
    error,
    currentMethod,
    currentVoice,
    lastPlayedText,
    // Expose internal methods for testing
    playWithOpenAI,
    playWithBrowser
  };
};
