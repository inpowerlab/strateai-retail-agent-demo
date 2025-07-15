
import { useState, useCallback, useRef } from 'react';

interface UseTextToSpeechOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  error: string | null;
  speak: (text: string) => void;
  stop: () => void;
  isSupported: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  isInitializing: boolean;
}

export const useTextToSpeech = (options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn => {
  const {
    language = 'es-ES',
    rate = 0.9, // Slightly slower for better comprehension
    pitch = 1,
    volume = 0.8 // Slightly lower volume
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if Speech Synthesis is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      setError('La síntesis de voz no está disponible en este navegador');
      return;
    }

    if (isMuted || !text?.trim()) {
      return;
    }

    try {
      // Stop any current speech
      window.speechSynthesis.cancel();
      setIsInitializing(true);

      // Clean text for better speech output
      const cleanText = text
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .replace(/([.!?])\s*([.!?])/g, '$1 $2') // Fix punctuation spacing
        .trim();

      if (!cleanText) {
        setIsInitializing(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Try to get Spanish voice if available
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(voice => 
        voice.lang.startsWith('es') || 
        voice.lang.includes('Spanish') ||
        voice.name.toLowerCase().includes('spanish')
      );
      
      if (spanishVoice) {
        utterance.voice = spanishVoice;
        console.log('Using Spanish voice:', spanishVoice.name);
      }

      utterance.onstart = () => {
        console.log('TTS started');
        setIsSpeaking(true);
        setError(null);
        setIsInitializing(false);
      };

      utterance.onend = () => {
        console.log('TTS ended');
        setIsSpeaking(false);
        setIsInitializing(false);
      };

      utterance.onerror = (event) => {
        console.error('TTS error:', event.error);
        let errorMessage = 'Error en la síntesis de voz';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Síntesis de voz no permitida en este contexto';
            break;
          case 'network':
            errorMessage = 'Error de red al reproducir voz';
            break;
          case 'synthesis-unavailable':
            errorMessage = 'Síntesis de voz no disponible';
            break;
          default:
            errorMessage = `Error de síntesis: ${event.error}`;
        }
        
        setError(errorMessage);
        setIsSpeaking(false);
        setIsInitializing(false);
      };

      utteranceRef.current = utterance;
      
      // Add small delay for better cross-platform compatibility
      setTimeout(() => {
        if (utteranceRef.current === utterance) {
          window.speechSynthesis.speak(utterance);
        }
      }, 100);

    } catch (error) {
      console.error('Error in text-to-speech:', error);
      setError('No se pudo reproducir el audio');
      setIsSpeaking(false);
      setIsInitializing(false);
    }
  }, [isSupported, isMuted, language, rate, pitch, volume]);

  const stop = useCallback(() => {
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsInitializing(false);
      } catch (error) {
        console.error('Error stopping TTS:', error);
      }
    }
  }, [isSupported]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (isSpeaking) {
      stop();
    }
  }, [isSpeaking, stop]);

  return {
    isSpeaking,
    error,
    speak,
    stop,
    isSupported,
    isMuted,
    toggleMute,
    isInitializing
  };
};
