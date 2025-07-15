
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
  const userGestureActiveRef = useRef<boolean>(false);
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Speech Synthesis is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Enhanced mobile detection
  const isMobile = typeof window !== 'undefined' && (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
  );

  // Enhanced Spanish female voice selection with mobile optimization
  const getBestSpanishVoice = useCallback(() => {
    if (!isSupported) return null;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Mobile-optimized voice priorities
    const voicePriorities = [
      // iOS Spanish voices (high quality)
      (v: SpeechSynthesisVoice) => isMobile && v.lang === 'es-ES' && v.localService && (
        v.name.toLowerCase().includes('mónica') ||
        v.name.toLowerCase().includes('elena') ||
        v.name.toLowerCase().includes('paulina')
      ),
      // Android Spanish voices
      (v: SpeechSynthesisVoice) => isMobile && v.lang === 'es-ES' && (
        v.name.toLowerCase().includes('spanish') ||
        v.name.toLowerCase().includes('español')
      ),
      // Desktop Spanish voices
      (v: SpeechSynthesisVoice) => !isMobile && v.lang === 'es-ES' && (
        v.name.toLowerCase().includes('mónica') ||
        v.name.toLowerCase().includes('elena') ||
        v.name.toLowerCase().includes('conchita')
      ),
      // Fallback to any Spanish voice
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es-ES'),
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es'),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('spanish')
    ];

    for (const priority of voicePriorities) {
      const voice = voices.find(priority);
      if (voice) {
        console.log(`🔊 Selected ${isMobile ? 'mobile' : 'desktop'} Spanish voice:`, voice.name, voice.lang);
        setCurrentVoice(voice.name);
        return voice;
      }
    }

    console.log('⚠️ No Spanish voice found, using default');
    setCurrentVoice('Default');
    return null;
  }, [isSupported, isMobile]);

  // Mobile-optimized audio context management
  const initializeAudioContext = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return false;

      // Create or resume existing audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        console.log(`🎵 Created new audio context (${isMobile ? 'mobile' : 'desktop'}):`, audioContextRef.current.state);
      }

      // Critical: Resume if suspended (especially important on mobile)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔓 Resumed suspended audio context');
      }

      const isRunning = audioContextRef.current.state === 'running';
      setCanAutoPlay(isRunning);
      
      console.log(`🎵 Audio context state: ${audioContextRef.current.state}, Can auto-play: ${isRunning} (${isMobile ? 'mobile' : 'desktop'})`);
      return isRunning;
    } catch (error) {
      console.error('❌ Audio context initialization failed:', error);
      return false;
    }
  }, [isSupported, isMobile]);

  // Mark user gesture as active with timeout
  const markUserGestureActive = useCallback(() => {
    userGestureActiveRef.current = true;
    console.log(`👆 User gesture marked active (${isMobile ? 'mobile' : 'desktop'})`);
    
    // Clear existing timeout
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }
    
    // Mobile gets longer gesture window
    const gestureWindow = isMobile ? 2000 : 1000;
    gestureTimeoutRef.current = setTimeout(() => {
      userGestureActiveRef.current = false;
      console.log(`⏰ User gesture window expired (${isMobile ? 'mobile' : 'desktop'})`);
    }, gestureWindow);
  }, [isMobile]);

  // Enhanced permission request with gesture preservation
  const requestPlayPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      console.log(`🔊 Requesting audio permission (${isMobile ? 'mobile' : 'desktop'})...`);
      
      // Mark gesture as active since this is called from user interaction
      markUserGestureActive();
      
      // Initialize audio context from user gesture
      const success = await initializeAudioContext();
      
      if (success) {
        console.log('✅ Audio playback permission granted');
        
        // On mobile, if there's pending playback, execute it immediately
        if (isMobile && pendingPlaybackRef.current && userGestureActiveRef.current) {
          const { text, messageId } = pendingPlaybackRef.current;
          pendingPlaybackRef.current = null;
          
          console.log('📱 Executing pending mobile TTS immediately');
          // Execute within the same call stack as user gesture
          performTTSPlayback(text, messageId);
        }
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to request audio permission:', error);
      setCanAutoPlay(false);
      return false;
    }
  }, [isSupported, isMobile, initializeAudioContext, markUserGestureActive]);

  // Clean text for natural speech
  const cleanTextForSpeech = useCallback((text: string): string => {
    if (!text?.trim()) return '';

    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([.!?])/g, '$1 $2')
      .replace(/\n+/g, '. ')
      .replace(/\s*[•·]\s*/g, '. ')
      .trim();
  }, []);

  // Core TTS playback with mobile optimization
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
        console.log(`🗣️ TTS started for message: ${messageId} (${isMobile ? 'mobile' : 'desktop'})`);
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
        console.log(`✅ TTS ended for message: ${messageId}`);
        setIsSpeaking(false);
        setIsInitializing(false);
        isProcessingRef.current = false;
        currentMessageIdRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error(`❌ TTS error (${isMobile ? 'mobile' : 'desktop'}):`, event.error);
        let errorMessage = '';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = isMobile 
              ? 'Toca el botón de reproducir para escuchar respuestas'
              : 'Síntesis de voz no permitida. Toca para reproducir manualmente.';
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
      
      // Mobile-specific: Immediate playback during user gesture
      if (isMobile && userGestureActiveRef.current) {
        console.log('📱 Mobile TTS: Playing during active user gesture');
        window.speechSynthesis.speak(utterance);
      } else if (!isMobile) {
        console.log('🖥️ Desktop TTS: Standard playback');
        window.speechSynthesis.speak(utterance);
      } else {
        console.log('📱 Mobile TTS: No active user gesture, storing for manual play');
        pendingPlaybackRef.current = { text, messageId };
        setError('');
        setIsInitializing(false);
        isProcessingRef.current = false;
        return;
      }
      
      console.log(`🎵 TTS playback initiated (${isMobile ? 'mobile' : 'desktop'})`);
      
    } catch (error) {
      console.error('❌ Failed to start TTS:', error);
      setError(isMobile ? 'Toca el botón de reproducir para escuchar' : 'No se pudo reproducir el audio');
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

    // Check if message was already spoken
    if (messageId && spokenMessagesRef.current.has(messageId)) {
      console.log('🔄 TTS: Message already spoken, skipping:', messageId);
      return;
    }

    // Mark as processing
    isProcessingRef.current = true;
    setIsInitializing(true);

    // Mobile-specific handling
    if (isMobile) {
      console.log(`📱 Mobile TTS request for: ${messageId}, User gesture active: ${userGestureActiveRef.current}`);
      
      // Check if we have active user gesture or audio context
      if (!canAutoPlay || !audioContextRef.current || audioContextRef.current.state !== 'running' || !userGestureActiveRef.current) {
        console.log('📱 Mobile TTS: Storing for manual play');
        pendingPlaybackRef.current = { text, messageId };
        setError('');
        setIsInitializing(false);
        isProcessingRef.current = false;
        return;
      }
      
      // Play immediately with active gesture
      console.log('📱 Mobile TTS: Playing with active gesture');
      performTTSPlayback(text, messageId);
    } else {
      // Desktop handling
      console.log(`🖥️ Desktop TTS request for: ${messageId}`);
      
      const processVoice = () => {
        performTTSPlayback(text, messageId);
      };

      // Check if voices are loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        const handleVoicesChanged = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          processVoice();
        };
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          processVoice();
        }, 1000);
      } else {
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
        userGestureActiveRef.current = false;
      } catch (error) {
        console.error('❌ Error stopping TTS:', error);
      }
    }
  }, [isSupported]);

  const replay = useCallback(() => {
    if (lastTextRef.current && !isSpeaking && !isInitializing) {
      console.log('🔄 Replaying last message');
      if (currentMessageIdRef.current) {
        spokenMessagesRef.current.delete(currentMessageIdRef.current);
      }
      // Mark gesture active for replay
      markUserGestureActive();
      speak(lastTextRef.current);
    }
  }, [isSpeaking, isInitializing, speak, markUserGestureActive]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (isSpeaking) {
      stop();
    }
    console.log('🔇 TTS mute toggled:', !isMuted);
  }, [isSpeaking, stop, isMuted]);

  // Initialize on mount
  useEffect(() => {
    initializeAudioContext();
  }, [initializeAudioContext]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
      // Clean up spoken messages cache
      if (spokenMessagesRef.current.size > 100) {
        spokenMessagesRef.current.clear();
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
