
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechToTextOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseSpeechToTextReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  isInitializing: boolean;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn => {
  const {
    language = 'es-ES',
    continuous = false,
    interimResults = false
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced browser compatibility check
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      // Enhanced event handlers with better error handling
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
        setIsInitializing(false);
        
        // Auto-stop after 30 seconds to prevent hanging
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
          }
        }, 30000);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          console.log('Speech recognition result:', finalTranscript);
          setTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = 'Error de reconocimiento de voz';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Permisos de micrófono denegados. Por favor, permite el acceso al micrófono.';
            break;
          case 'no-speech':
            errorMessage = 'No se detectó voz. Intenta hablar más cerca del micrófono.';
            break;
          case 'audio-capture':
            errorMessage = 'No se puede acceder al micrófono. Verifica que esté conectado.';
            break;
          case 'network':
            errorMessage = 'Error de red. Verifica tu conexión a internet.';
            break;
          default:
            errorMessage = `Error de reconocimiento: ${event.error}`;
        }
        
        setError(errorMessage);
        setIsListening(false);
        setIsInitializing(false);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        setIsInitializing(false);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      setError('No se pudo inicializar el reconocimiento de voz');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, continuous, interimResults, isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('El reconocimiento de voz no está disponible en este navegador');
      return;
    }

    if (recognitionRef.current && !isListening && !isInitializing) {
      try {
        setError(null);
        setTranscript('');
        setIsInitializing(true);
        
        // Request microphone permission first on mobile
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
              if (recognitionRef.current) {
                recognitionRef.current.start();
              }
            })
            .catch((err) => {
              console.error('Microphone permission denied:', err);
              setError('Permisos de micrófono requeridos para usar esta función');
              setIsInitializing(false);
            });
        } else {
          recognitionRef.current.start();
        }
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError('No se pudo iniciar el reconocimiento de voz');
        setIsInitializing(false);
      }
    }
  }, [isSupported, isListening, isInitializing]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && (isListening || isInitializing)) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [isListening, isInitializing]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    isInitializing
  };
};
