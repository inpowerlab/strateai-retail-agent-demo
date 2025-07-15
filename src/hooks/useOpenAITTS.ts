
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OpenAITTSOptions {
  voice?: 'nova' | 'onyx' | 'alloy';
  speed?: number;
  fallbackToNative?: boolean;
}

interface OpenAITTSReturn {
  speak: (text: string, options?: OpenAITTSOptions) => Promise<boolean>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  lastUsedMethod: 'openai' | 'native' | null;
  audioElement: HTMLAudioElement | null;
}

export const useOpenAITTS = (): OpenAITTSReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsedMethod, setLastUsedMethod] = useState<'openai' | 'native' | null>(null);
  
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean up audio resources
  const cleanup = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.removeEventListener('ended', () => setIsSpeaking(false));
      audioElementRef.current.removeEventListener('error', () => setIsSpeaking(false));
      audioElementRef.current = null;
    }
    
    if (currentUtteranceRef.current) {
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
  }, []);

  // Native TTS fallback for Spanish female voices
  const speakWithNativeTTS = useCallback((text: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        console.log('🔄 Attempting native TTS fallback...');
        
        const voices = window.speechSynthesis.getVoices();
        const spanishFemaleVoice = voices.find(voice => 
          voice.lang.startsWith('es') && (
            voice.name.toLowerCase().includes('mónica') ||
            voice.name.toLowerCase().includes('elena') ||
            voice.name.toLowerCase().includes('conchita') ||
            voice.name.toLowerCase().includes('paulina')
          )
        );

        if (!spanishFemaleVoice) {
          console.warn('⚠️ No suitable Spanish female voice found for native fallback');
          setError('No Spanish female voice available');
          resolve(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = spanishFemaleVoice;
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 0.9;

        utterance.onstart = () => {
          console.log('🗣️ Native TTS started with voice:', spanishFemaleVoice.name);
          setIsSpeaking(true);
          setLastUsedMethod('native');
        };

        utterance.onend = () => {
          console.log('✅ Native TTS completed');
          setIsSpeaking(false);
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error('❌ Native TTS error:', event.error);
          setError(`Native TTS failed: ${event.error}`);
          setIsSpeaking(false);
          resolve(false);
        };

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);

      } catch (error) {
        console.error('❌ Native TTS exception:', error);
        setError(`Native TTS exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
        resolve(false);
      }
    });
  }, []);

  // Main OpenAI TTS function
  const speak = useCallback(async (text: string, options: OpenAITTSOptions = {}): Promise<boolean> => {
    const {
      voice = 'nova',
      speed = 1.0,
      fallbackToNative = true
    } = options;

    // Reset state
    setError(null);
    setIsLoading(true);
    cleanup();

    try {
      console.log('🔊 Requesting OpenAI TTS...', { voice, speed, textLength: text.length });

      // Call OpenAI TTS Edge Function
      const { data, error: supabaseError } = await supabase.functions.invoke('openai-tts', {
        body: {
          text,
          lang: 'es',
          voice,
          speed
        }
      });

      if (supabaseError) {
        console.error('❌ Supabase function error:', supabaseError);
        throw new Error(`TTS service error: ${supabaseError.message}`);
      }

      if (!data.success) {
        console.warn('⚠️ OpenAI TTS failed:', data.error);
        
        if (data.fallbackRequired && fallbackToNative) {
          console.log('🔄 Attempting native TTS fallback...');
          setIsLoading(false);
          return await speakWithNativeTTS(text);
        }
        
        throw new Error(data.error || 'OpenAI TTS failed');
      }

      // Play OpenAI audio
      if (data.audioData) {
        console.log('🎵 Playing OpenAI TTS audio...');
        
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioData), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.addEventListener('loadstart', () => {
          console.log('📡 Audio loading started...');
        });
        
        audio.addEventListener('canplay', () => {
          console.log('▶️ Audio ready to play');
        });
        
        audio.addEventListener('play', () => {
          console.log('🔊 OpenAI TTS playback started');
          setIsSpeaking(true);
          setLastUsedMethod('openai');
          setIsLoading(false);
        });
        
        audio.addEventListener('ended', () => {
          console.log('✅ OpenAI TTS playback completed');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        });
        
        audio.addEventListener('error', (e) => {
          console.error('❌ Audio playback error:', e);
          setError('Audio playback failed');
          setIsSpeaking(false);
          setIsLoading(false);
          URL.revokeObjectURL(audioUrl);
        });

        audioElementRef.current = audio;
        
        // Attempt to play (requires user gesture)
        try {
          await audio.play();
          return true;
        } catch (playError) {
          console.warn('⚠️ Audio autoplay blocked:', playError);
          setError('Tap to enable audio playback');
          setIsLoading(false);
          return false;
        }
      }

      return false;

    } catch (error) {
      console.error('❌ OpenAI TTS error:', error);
      setError(error instanceof Error ? error.message : 'TTS failed');
      setIsLoading(false);

      // Fallback to native TTS if enabled
      if (fallbackToNative) {
        console.log('🔄 Falling back to native TTS...');
        return await speakWithNativeTTS(text);
      }

      return false;
    }
  }, [cleanup, speakWithNativeTTS]);

  const stop = useCallback(() => {
    console.log('🛑 Stopping TTS playback...');
    cleanup();
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanup]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    error,
    lastUsedMethod,
    audioElement: audioElementRef.current
  };
};
