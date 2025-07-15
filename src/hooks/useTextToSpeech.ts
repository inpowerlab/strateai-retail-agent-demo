
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTextToSpeechOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  error: string | null;
  speak: (text: string, messageId?: string) => void;
  stop: () => void;
  isSupported: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  isInitializing: boolean;
}

export const useTextToSpeech = (options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn => {
  const {
    language = 'es-ES',
    rate = 0.9,
    pitch = 1,
    volume = 0.8
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const spokenMessagesRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef<boolean>(false);

  // Check if Speech Synthesis is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Get best Spanish voice available
  const getBestSpanishVoice = useCallback(() => {
    if (!isSupported) return null;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Priority order for Spanish voices
    const voicePriorities = [
      // Female Spanish voices (preferred)
      (v: SpeechSynthesisVoice) => v.lang === 'es-ES' && v.name.toLowerCase().includes('female'),
      (v: SpeechSynthesisVoice) => v.lang === 'es-ES' && (v.name.toLowerCase().includes('monica') || v.name.toLowerCase().includes('elena')),
      (v: SpeechSynthesisVoice) => v.lang === 'es-ES' && v.name.toLowerCase().includes('spanish'),
      // Any Spanish voice
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es-ES'),
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es'),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('spanish'),
    ];

    for (const priority of voicePriorities) {
      const voice = voices.find(priority);
      if (voice) {
        console.log('Selected Spanish voice:', voice.name, voice.lang);
        return voice;
      }
    }

    console.log('No Spanish voice found, using default');
    return null;
  }, [isSupported]);

  // Clean and prepare text for speech
  const cleanTextForSpeech = useCallback((text: string): string => {
    if (!text?.trim()) return '';

    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/([.!?])\s*([.!?])/g, '$1 $2') // Fix punctuation spacing
      .replace(/\n+/g, '. ') // Convert line breaks to pauses
      .trim();
  }, []);

  const speak = useCallback((text: string, messageId?: string) => {
    // Early returns for unsupported or muted states
    if (!isSupported || isMuted || !text?.trim()) {
      return;
    }

    // Prevent re-processing if already processing
    if (isProcessingRef.current) {
      console.log('TTS: Already processing, skipping');
      return;
    }

    // Check if message was already spoken (debounce protection)
    if (messageId && spokenMessagesRef.current.has(messageId)) {
      console.log('TTS: Message already spoken, skipping:', messageId);
      return;
    }

    // Mark as processing to prevent re-entry
    isProcessingRef.current = true;
    setIsInitializing(true);

    try {
      // Stop any current speech
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const cleanText = cleanTextForSpeech(text);
      if (!cleanText) {
        isProcessingRef.current = false;
        setIsInitializing(false);
        return;
      }

      // Wait for voices to be loaded if needed
      const processVoice = () => {
        const selectedVoice = getBestSpanishVoice();
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = language;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          console.log('TTS started for message:', messageId);
          setIsSpeaking(true);
          setError(null);
          setIsInitializing(false);
          currentMessageIdRef.current = messageId || null;
          
          // Mark message as spoken
          if (messageId) {
            spokenMessagesRef.current.add(messageId);
          }
        };

        utterance.onend = () => {
          console.log('TTS ended for message:', messageId);
          setIsSpeaking(false);
          setIsInitializing(false);
          isProcessingRef.current = false;
          currentMessageIdRef.current = null;
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
          isProcessingRef.current = false;
          currentMessageIdRef.current = null;
        };

        utteranceRef.current = utterance;
        
        // Speak with small delay for better browser compatibility
        setTimeout(() => {
          if (utteranceRef.current === utterance && !window.speechSynthesis.speaking) {
            window.speechSynthesis.speak(utterance);
          } else {
            isProcessingRef.current = false;
            setIsInitializing(false);
          }
        }, 100);
      };

      // Check if voices are loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Wait for voices to load
        const handleVoicesChanged = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          processVoice();
        };
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        
        // Fallback timeout
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          processVoice();
        }, 1000);
      } else {
        processVoice();
      }

    } catch (error) {
      console.error('Error in text-to-speech:', error);
      setError('No se pudo reproducir el audio');
      setIsSpeaking(false);
      setIsInitializing(false);
      isProcessingRef.current = false;
    }
  }, [isSupported, isMuted, language, rate, pitch, volume, getBestSpanishVoice, cleanTextForSpeech]);

  const stop = useCallback(() => {
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsInitializing(false);
        isProcessingRef.current = false;
        currentMessageIdRef.current = null;
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

  // Clean up spoken messages periodically to prevent memory leak
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (spokenMessagesRef.current.size > 100) {
        spokenMessagesRef.current.clear();
      }
    }, 60000); // Clean every minute

    return () => clearInterval(cleanup);
  }, []);

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
