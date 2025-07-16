
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  selectBestVoice, 
  VoiceSelectionResult 
} from '@/utils/voiceSelection';

interface GoogleTTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  enableFallback?: boolean;
}

interface TTSPlaybackResult {
  success: boolean;
  method: 'google' | 'browser' | 'failed';
  voice?: string;
  error?: string;
  fallbackUsed?: boolean;
}

// Premium Spanish female voices available in Google Cloud TTS
export const GOOGLE_SPANISH_VOICES = [
  { name: 'es-US-Journey-F', label: 'Journey (Premium Female)', tier: 'premium' },
  { name: 'es-US-Studio-B', label: 'Studio (High Quality Female)', tier: 'studio' },
  { name: 'es-ES-Standard-A', label: 'Spanish Spain (Female)', tier: 'standard' },
  { name: 'es-MX-Standard-A', label: 'Mexican Spanish (Female)', tier: 'standard' },
  { name: 'es-US-Standard-A', label: 'US Spanish (Female)', tier: 'standard' },
];

export const useGoogleTTS = (options: GoogleTTSOptions = {}) => {
  const {
    voice = 'es-US-Journey-F',
    speed = 1.0,
    pitch = 0.0,
    enableFallback = true
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMethod, setCurrentMethod] = useState<'google' | 'browser' | null>(null);
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

  // Google Cloud TTS via Edge Function
  const playWithGoogle = useCallback(async (text: string): Promise<TTSPlaybackResult> => {
    try {
      console.log('🎤 [Google TTS] Starting playback with premium voice:', voice);
      
      const { data, error: functionError } = await supabase.functions.invoke('google-cloud-tts', {
        body: {
          text,
          voice,
          speed,
          pitch
        }
      });

      if (functionError || !data) {
        throw new Error(functionError?.message || 'Failed to call Google TTS function');
      }

      if (!data.success) {
        const shouldFallback = data.fallbackRequired;
        console.warn('🚨 [Google TTS] Failed:', data.error, shouldFallback ? '(fallback enabled)' : '');
        
        if (shouldFallback && enableFallback) {
          return { success: false, method: 'failed', error: data.error, fallbackUsed: true };
        }
        
        throw new Error(data.error || 'Google TTS generation failed');
      }

      // Play the audio
      const audio = new Audio();
      audioRef.current = audio;
      
      return new Promise((resolve) => {
        audio.onloadeddata = () => {
          console.log('🔊 [Google TTS] Audio loaded, starting playback');
          const voiceLabel = GOOGLE_SPANISH_VOICES.find(v => v.name === voice)?.label || voice;
          setCurrentMethod('google');
          setCurrentVoice(`${voiceLabel} (Google Cloud)`);
          setIsPlaying(true);
          setIsInitializing(false);
        };

        audio.onended = () => {
          console.log('✅ [Google TTS] Playback completed');
          cleanup();
          resolve({ success: true, method: 'google', voice: voice });
        };

        audio.onerror = (e) => {
          console.error('❌ [Google TTS] Audio playback error:', e);
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
          console.error('❌ [Google TTS] Play failed:', playError);
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
      console.error('❌ [Google TTS] Error:', error);
      return { 
        success: false, 
        method: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: enableFallback
      };
    }
  }, [voice, speed, pitch, enableFallback, cleanup]);

  // Browser TTS fallback
  const playWithBrowser = useCallback(async (text: string): Promise<TTSPlaybackResult> => {
    try {
      console.log('🗣️ [Browser TTS] Starting fallback playback');
      
      // Get the best available Spanish female voice
      if (!fallbackVoiceRef.current) {
        fallbackVoiceRef.current = await selectBestVoice({
          preferredLanguage: 'es-ES',
          requireSpanish: true,
          requireFemale: true,
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
        utterance.pitch = 1 + (pitch / 10); // Convert Google's pitch to browser range
        utterance.volume = 0.8;
        utterance.lang = 'es-ES';

        utterance.onstart = () => {
          console.log(`🎵 [Browser TTS] Started with ${voiceResult.name} (Tier ${voiceResult.tier})`);
          setCurrentMethod('browser');
          setCurrentVoice(`${voiceResult.name} (Browser Fallback)`);
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
  }, [speed, pitch, cleanup]);

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

    console.log('🎯 [Universal TTS] Starting with Google Cloud premium, browser fallback');

    try {
      // Try Google Cloud TTS first
      const googleResult = await playWithGoogle(text);
      
      if (googleResult.success) {
        console.log('✅ [Universal TTS] Google Cloud TTS succeeded');
        return googleResult;
      }

      // If Google failed and fallback is enabled, try browser TTS
      if (enableFallback && googleResult.fallbackUsed) {
        console.log('🔄 [Universal TTS] Falling back to browser TTS');
        const browserResult = await playWithBrowser(text);
        
        if (browserResult.success) {
          console.log('✅ [Universal TTS] Browser TTS fallback succeeded');
          return browserResult;
        }
        
        // Both failed
        const errorMessage = `Both Google and browser TTS failed. Google: ${googleResult.error}, Browser: ${browserResult.error}`;
        setError(errorMessage);
        return { success: false, method: 'failed', error: errorMessage };
      }

      // Only Google attempted, fallback disabled
      setError(googleResult.error || 'TTS failed');
      return googleResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
      console.error('❌ [Universal TTS] Unexpected error:', error);
      setError(errorMessage);
      cleanup();
      return { success: false, method: 'failed', error: errorMessage };
    }
  }, [playWithGoogle, playWithBrowser, enableFallback, cleanup]);

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
    availableVoices: GOOGLE_SPANISH_VOICES,
    // Expose internal methods for testing
    playWithGoogle,
    playWithBrowser
  };
};
