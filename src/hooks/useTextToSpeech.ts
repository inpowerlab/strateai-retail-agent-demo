
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
  replay: () => void;
  isSupported: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  isInitializing: boolean;
  lastSpokenMessage: string | null;
  currentVoice: string | null;
  canAutoPlay: boolean;
  requestPlayPermission: () => Promise<boolean>;
  isMobile: boolean;
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
  const [lastSpokenMessage, setLastSpokenMessage] = useState<string | null>(null);
  const [currentVoice, setCurrentVoice] = useState<string | null>(null);
  const [canAutoPlay, setCanAutoPlay] = useState(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const spokenMessagesRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef<boolean>(false);
  const lastTextRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const pendingPlaybackRef = useRef<{ text: string; messageId?: string } | null>(null);
  const userGestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Speech Synthesis is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Mobile detection for specialized handling
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Enhanced Spanish female voice selection with priority ranking
  const getBestSpanishVoice = useCallback(() => {
    if (!isSupported) return null;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Priority order for natural female Spanish voices
    const femaleVoicePriorities = [
      // Primary female Spanish voices
      (v: SpeechSynthesisVoice) => v.lang === 'es-ES' && (
        v.name.toLowerCase().includes('mónica') ||
        v.name.toLowerCase().includes('monica') ||
        v.name.toLowerCase().includes('elena') ||
        v.name.toLowerCase().includes('conchita') ||
        v.name.toLowerCase().includes('paulina') ||
        v.name.toLowerCase().includes('esperanza') ||
        v.name.toLowerCase().includes('carmen')
      ),
      // Any female Spanish voice
      (v: SpeechSynthesisVoice) => v.lang === 'es-ES' && (
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('mujer') ||
        v.name.toLowerCase().includes('femenina') ||
        v.name.toLowerCase().includes('woman')
      ),
      // High quality Spanish voices (likely female by default)
      (v: SpeechSynthesisVoice) => v.lang === 'es-ES' && (
        v.name.toLowerCase().includes('premium') ||
        v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('enhanced') ||
        v.name.toLowerCase().includes('neural')
      ),
      // Any es-ES voice
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es-ES'),
      // Any Spanish voice
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es'),
      // Spanish in name
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('spanish'),
    ];

    for (const priority of femaleVoicePriorities) {
      const voice = voices.find(priority);
      if (voice) {
        console.log('🔊 Selected Spanish voice:', voice.name, voice.lang);
        setCurrentVoice(voice.name);
        return voice;
      }
    }

    console.log('⚠️ No Spanish voice found, using default');
    setCurrentVoice('Default');
    return null;
  }, [isSupported]);

  // Enhanced mobile-compatible audio context management
  const initializeAudioContext = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return false;

      // Create or resume existing audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        console.log('🎵 Created new audio context:', audioContextRef.current.state);
      }

      // Resume if suspended (critical for mobile)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔓 Resumed suspended audio context');
      }

      const isRunning = audioContextRef.current.state === 'running';
      setCanAutoPlay(isRunning);
      
      console.log('🎵 Audio context state:', audioContextRef.current.state, 'Can auto-play:', isRunning);
      return isRunning;
    } catch (error) {
      console.error('❌ Audio context initialization failed:', error);
      return false;
    }
  }, [isSupported]);

  // Request permission to play audio (MUST be called from user gesture)
  const requestPlayPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      console.log('🔊 Requesting audio playback permission...');
      
      // Initialize audio context from user gesture
      const success = await initializeAudioContext();
      
      if (success) {
        console.log('✅ Audio playback permission granted');
        
        // On mobile, if there's pending playback, execute it immediately within user gesture
        if (isMobile && pendingPlaybackRef.current) {
          const { text, messageId } = pendingPlaybackRef.current;
          pendingPlaybackRef.current = null;
          
          console.log('📱 Executing pending mobile TTS playback');
          // Execute immediately while we still have user gesture context
          setTimeout(() => performTTSPlayback(text, messageId), 50);
        }
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to request audio permission:', error);
      setCanAutoPlay(false);
      return false;
    }
  }, [isSupported, isMobile, initializeAudioContext]);

  // Clean and prepare text for natural speech
  const cleanTextForSpeech = useCallback((text: string): string => {
    if (!text?.trim()) return '';

    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown  
      .replace(/`(.*?)`/g, '$1') // Remove code markdown
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/#{1,6}\s*/g, '') // Remove headers
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/([.!?])\s*([.!?])/g, '$1 $2') // Fix punctuation spacing
      .replace(/\n+/g, '. ') // Convert line breaks to pauses
      .replace(/\s*[•·]\s*/g, '. ') // Convert bullets to pauses
      .trim();
  }, []);

  // Core TTS playback function
  const performTTSPlayback = useCallback((text: string, messageId?: string) => {
    try {
      // Stop any current speech
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const cleanText = cleanTextForSpeech(text);
      if (!cleanText) return;

      // Store for replay functionality
      lastTextRef.current = cleanText;
      setLastSpokenMessage(cleanText);

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
        console.log('🗣️ TTS started for message:', messageId, isMobile ? '(mobile)' : '(desktop)');
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
        console.log('✅ TTS ended for message:', messageId);
        setIsSpeaking(false);
        setIsInitializing(false);
        isProcessingRef.current = false;
        currentMessageIdRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('❌ TTS error:', event.error, isMobile ? '(mobile)' : '(desktop)');
        let errorMessage = 'Error en la síntesis de voz';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Síntesis de voz no permitida. Toca para reproducir manualmente.';
            setCanAutoPlay(false);
            break;
          case 'network':
            errorMessage = 'Error de red al reproducir voz';
            break;
          case 'synthesis-unavailable':
            errorMessage = 'Síntesis de voz no disponible';
            break;
          case 'interrupted':
            // Don't show error for intentional interruptions
            errorMessage = '';
            break;
          default:
            errorMessage = `Error de síntesis: ${event.error}`;
        }
        
        if (errorMessage) {
          setError(errorMessage);
        }
        setIsSpeaking(false);
        setIsInitializing(false);
        isProcessingRef.current = false;
        currentMessageIdRef.current = null;
      };

      utteranceRef.current = utterance;
      
      // Immediate playback for better mobile compatibility
      window.speechSynthesis.speak(utterance);
      console.log('🎵 TTS playback started', isMobile ? '(mobile)' : '(desktop)');
      
    } catch (error) {
      console.error('❌ Failed to start TTS:', error);
      setError('No se pudo reproducir el audio. Toca para reproducir manualmente.');
      setCanAutoPlay(false);
      isProcessingRef.current = false;
      setIsInitializing(false);
    }
  }, [cleanTextForSpeech, getBestSpanishVoice, language, rate, pitch, volume, isMobile]);

  const speak = useCallback((text: string, messageId?: string) => {
    // Early returns for unsupported or muted states
    if (!isSupported || isMuted || !text?.trim()) {
      return;
    }

    // Prevent re-processing if already processing
    if (isProcessingRef.current) {
      console.log('🔄 TTS: Already processing, skipping');
      return;
    }

    // Check if message was already spoken (debounce protection)
    if (messageId && spokenMessagesRef.current.has(messageId)) {
      console.log('🔄 TTS: Message already spoken, skipping:', messageId);
      return;
    }

    // Mark as processing to prevent re-entry
    isProcessingRef.current = true;
    setIsInitializing(true);

    // Mobile-specific handling
    if (isMobile) {
      console.log('📱 Mobile TTS request for:', messageId);
      
      // Check if we have active audio context (user gesture recent)
      if (!canAutoPlay || !audioContextRef.current || audioContextRef.current.state !== 'running') {
        console.log('📱 Mobile TTS: No active audio context, storing for manual play');
        pendingPlaybackRef.current = { text, messageId };
        setError('');
        setIsInitializing(false);
        isProcessingRef.current = false;
        return;
      }
      
      // We have permission, play immediately
      console.log('📱 Mobile TTS: Playing with active audio context');
      performTTSPlayback(text, messageId);
    } else {
      // Desktop handling - can use delayed playback
      console.log('🖥️ Desktop TTS request for:', messageId);
      
      // Wait for voices to be loaded if needed
      const processVoice = () => {
        performTTSPlayback(text, messageId);
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
        // Small delay for better browser compatibility on desktop
        setTimeout(processVoice, 100);
      }
    }
  }, [isSupported, isMuted, isMobile, canAutoPlay, performTTSPlayback]);

  const stop = useCallback(() => {
    if (isSupported) {
      try {
        console.log('🛑 Stopping TTS playback');
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsInitializing(false);
        isProcessingRef.current = false;
        currentMessageIdRef.current = null;
        pendingPlaybackRef.current = null;
      } catch (error) {
        console.error('❌ Error stopping TTS:', error);
      }
    }
  }, [isSupported]);

  const replay = useCallback(() => {
    if (lastTextRef.current && !isSpeaking && !isInitializing) {
      console.log('🔄 Replaying last message');
      // Clear the spoken messages cache for the last message to allow replay
      if (currentMessageIdRef.current) {
        spokenMessagesRef.current.delete(currentMessageIdRef.current);
      }
      speak(lastTextRef.current);
    }
  }, [lastTextRef.current, isSpeaking, isInitializing, speak]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (isSpeaking) {
      stop();
    }
    console.log('🔇 TTS mute toggled:', !isMuted);
  }, [isSpeaking, stop, isMuted]);

  // Check auto-play capability on mount
  useEffect(() => {
    initializeAudioContext();
  }, [initializeAudioContext]);

  // Clean up spoken messages periodically to prevent memory leak
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (spokenMessagesRef.current.size > 100) {
        spokenMessagesRef.current.clear();
        console.log('🧹 Cleaned up TTS message cache');
      }
    }, 60000); // Clean every minute

    return () => clearInterval(cleanup);
  }, []);

  // Cleanup audio context and timers on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (userGestureTimeoutRef.current) {
        clearTimeout(userGestureTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSpeaking,
    error,
    speak,
    stop,
    replay,
    isSupported,
    isMuted,
    toggleMute,
    isInitializing,
    lastSpokenMessage,
    currentVoice,
    canAutoPlay,
    requestPlayPermission,
    isMobile
  };
};
