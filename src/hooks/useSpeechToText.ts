
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechToTextOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxRecordingTime?: number;
  silenceTimeout?: number;
}

interface UseSpeechToTextReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  isInitializing: boolean;
  hasPermission: boolean;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn => {
  const {
    language = 'es-ES',
    continuous = false,
    interimResults = false,
    maxRecordingTime = 30000, // 30 seconds max
    silenceTimeout = 3000 // 3 seconds of silence
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const isStoppingRef = useRef<boolean>(false);

  // Enhanced browser compatibility check
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  // Request microphone permission and prepare TTS context
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🎤 Requesting microphone permissions...');
      
      // Request microphone permission explicitly
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Immediately close the stream as we only needed permission
        stream.getTracks().forEach(track => track.stop());
        
        console.log('✅ Microphone permission granted');
        setHasPermission(true);
        
        // Create audio context for TTS unlock on mobile (user gesture)
        if (window.AudioContext || (window as any).webkitAudioContext) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContext();
          
          // Play a silent sound to unlock audio context
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          gainNode.gain.value = 0;
          oscillator.frequency.value = 440;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.01);
          
          console.log('🔊 Audio context unlocked for TTS');
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      let errorMessage = 'Permisos de micrófono denegados. Por favor, permite el acceso al micrófono para usar la función de voz.';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Acceso al micrófono denegado. Por favor, permite el acceso en la configuración del navegador.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No se encontró micrófono. Verifica que esté conectado y funcionando.';
        }
      }
      
      setError(errorMessage);
      setHasPermission(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        setError(null);
        setIsInitializing(false);
        isStoppingRef.current = false;
        lastSpeechTimeRef.current = Date.now();
        
        // Set maximum recording time
        maxTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Maximum recording time reached, stopping...');
          stopListening();
        }, maxRecordingTime);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let hasNewSpeech = false;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            hasNewSpeech = true;
          }
        }

        if (hasNewSpeech) {
          lastSpeechTimeRef.current = Date.now();
          console.log('🗣️ Speech detected:', finalTranscript);
          setTranscript(finalTranscript.trim());
          
          // Reset silence timer when speech is detected
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Start silence detection timer
          silenceTimerRef.current = setTimeout(() => {
            console.log('🔇 Silence detected, stopping recording...');
            stopListening();
          }, silenceTimeout);
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        
        let errorMessage = 'Error de reconocimiento de voz';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Permisos de micrófono denegados. Recarga la página y permite el acceso.';
            setHasPermission(false);
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
          case 'aborted':
            // Don't show error for intentional stops
            if (!isStoppingRef.current) {
              errorMessage = 'Grabación interrumpida inesperadamente.';
            } else {
              errorMessage = '';
            }
            break;
          default:
            errorMessage = `Error de reconocimiento: ${event.error}`;
        }
        
        if (errorMessage) {
          setError(errorMessage);
        }
        setIsListening(false);
        setIsInitializing(false);
        clearAllTimers();
      };

      recognition.onend = () => {
        console.log('🔴 Speech recognition ended');
        setIsListening(false);
        setIsInitializing(false);
        clearAllTimers();
      };

    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      setError('No se pudo inicializar el reconocimiento de voz');
    }

    return () => {
      clearAllTimers();
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.error('Error aborting recognition:', error);
        }
      }
    };
  }, [language, continuous, interimResults, isSupported, maxRecordingTime, silenceTimeout, clearAllTimers, stopListening, isListening]);

  const startListening = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError('El reconocimiento de voz no está disponible en este navegador');
      return;
    }

    if (isListening || isInitializing) {
      console.log('🔄 Already listening or initializing, ignoring start request');
      return;
    }

    try {
      setError(null);
      setTranscript('');
      setIsInitializing(true);
      isStoppingRef.current = false;
      
      console.log('🎯 Starting voice input with permission request...');
      
      // Request permissions first (this also unlocks TTS on mobile)
      const hasPermissions = await requestPermissions();
      
      if (!hasPermissions) {
        setIsInitializing(false);
        return;
      }

      // Small delay to ensure microphone is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (recognitionRef.current && !isStoppingRef.current) {
        recognitionRef.current.start();
        console.log('✅ Speech recognition start requested');
      } else {
        setIsInitializing(false);
        console.log('❌ Recognition not available or already stopping');
      }
      
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('No se pudo iniciar el reconocimiento de voz');
      setIsInitializing(false);
      setHasPermission(false);
    }
  }, [isSupported, isListening, isInitializing, requestPermissions]);

  const stopListening = useCallback(() => {
    console.log('🛑 Stopping speech recognition...');
    isStoppingRef.current = true;
    
    clearAllTimers();
    
    if (recognitionRef.current && (isListening || isInitializing)) {
      try {
        recognitionRef.current.stop();
        console.log('✅ Speech recognition stop requested');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        // Force state reset even if stop fails
        setIsListening(false);
        setIsInitializing(false);
      }
    } else {
      // Ensure state is reset even if recognition wasn't active
      setIsListening(false);
      setIsInitializing(false);
    }
  }, [isListening, isInitializing, clearAllTimers]);

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
    isInitializing,
    hasPermission
  };
};
