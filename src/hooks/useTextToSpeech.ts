
import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceAuditSummary, performVoiceAudit } from '@/utils/voiceAudit';
import { 
  selectBestVoice, 
  testVoicePlayback, 
  clearVoiceCache,
  VoiceSelectionResult 
} from '@/utils/voiceSelection';

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
  currentVoiceInfo: VoiceSelectionResult | null;
  canAutoPlay: boolean;
  requestPlayPermission: () => Promise<boolean>;
  isMobile: boolean;
  voiceAudit: VoiceAuditSummary | null;
  runVoiceAudit: () => Promise<VoiceAuditSummary>;
  auditError: string | null;
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
  const [currentVoiceInfo, setCurrentVoiceInfo] = useState<VoiceSelectionResult | null>(null);
  const [canAutoPlay, setCanAutoPlay] = useState(false);
  const [voiceAudit, setVoiceAudit] = useState<VoiceAuditSummary | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const spokenMessagesRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef<boolean>(false);
  const lastTextRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const pendingPlaybackRef = useRef<{ text: string; messageId?: string } | null>(null);
  const userGestureActiveRef = useRef<boolean>(false);
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackAttemptRef = useRef<number>(0);

  // Check if Speech Synthesis is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Enhanced mobile detection
  const isMobile = typeof window !== 'undefined' && (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
  );

  // Universal voice selection with comprehensive fallback
  const selectUniversalVoice = useCallback(async (): Promise<VoiceSelectionResult> => {
    try {
      console.log('🎯 Selecting universal voice with fallback...');
      
      // Select best voice with fallback enabled
      const voiceResult = await selectBestVoice({
        preferredLanguage: language,
        requireSpanish: false, // Allow non-Spanish fallback
        requireFemale: false,  // Allow male/neutral fallback
        allowFallback: true    // Enable all fallbacks
      });

      console.log('🔊 Voice selection result:', {
        name: voiceResult.name,
        tier: voiceResult.tier,
        fallbackUsed: voiceResult.fallbackUsed,
        quality: voiceResult.quality,
        reasoning: voiceResult.reasoning
      });

      // Update current voice info
      setCurrentVoice(voiceResult.name);
      setCurrentVoiceInfo(voiceResult);

      return voiceResult;
    } catch (error) {
      console.error('❌ Universal voice selection failed:', error);
      
      // Last resort: try to use any available voice
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const fallbackVoice = voices[0];
        const result: VoiceSelectionResult = {
          voice: fallbackVoice,
          tier: 4,
          reasoning: 'Emergency fallback - using first available voice',
          fallbackUsed: true,
          quality: 'fallback',
          name: fallbackVoice.name,
          lang: fallbackVoice.lang
        };
        
        setCurrentVoice(result.name);
        setCurrentVoiceInfo(result);
        return result;
      }

      // No voices available at all
      const result: VoiceSelectionResult = {
        voice: null,
        tier: 4,
        reasoning: 'No voices available on this system',
        fallbackUsed: false,
        quality: 'fallback',
        name: 'None',
        lang: 'none'
      };
      
      setCurrentVoice('None');
      setCurrentVoiceInfo(result);
      return result;
    }
  }, [language]);

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

  // Core TTS playback with progressive fallback
  const performTTSPlayback = useCallback(async (text: string, messageId?: string) => {
    try {
      console.log('🎤 Starting TTS playback with universal fallback...');
      
      // Stop any current speech
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const cleanText = cleanTextForSpeech(text);
      if (!cleanText) {
        console.warn('⚠️ No text to speak after cleaning');
        return;
      }

      // Store for replay functionality
      lastTextRef.current = cleanText;
      setLastSpokenMessage(cleanText);

      // Get the best available voice using universal selection
      const voiceResult = await selectUniversalVoice();
      
      if (!voiceResult.voice) {
        throw new Error('No voices available for TTS playback');
      }

      // Create utterance with selected voice
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.voice = voiceResult.voice;

      // Set up event handlers
      utterance.onstart = () => {
        console.log(`🗣️ TTS started with voice: ${voiceResult.name} (Tier ${voiceResult.tier})`);
        console.log(`📊 Voice info: ${voiceResult.reasoning}`);
        setIsSpeaking(true);
        setError(null);
        setIsInitializing(false);
        currentMessageIdRef.current = messageId || null;
        fallbackAttemptRef.current = 0; // Reset fallback counter
        
        // Mark message as spoken
        if (messageId) {
          spokenMessagesRef.current.add(messageId);
        }
      };

      utterance.onend = () => {
        console.log(`✅ TTS ended successfully for message: ${messageId}`);
        setIsSpeaking(false);
        setIsInitializing(false);
        isProcessingRef.current = false;
        currentMessageIdRef.current = null;
      };

      utterance.onerror = async (event) => {
        console.error(`❌ TTS error with voice ${voiceResult.name}:`, event.error);
        
        // Try progressive fallback on error
        if (fallbackAttemptRef.current < 3) { // Max 3 fallback attempts
          fallbackAttemptRef.current++;
          console.log(`🔄 Attempting fallback #${fallbackAttemptRef.current}...`);
          
          try {
            // Clear voice cache and try again
            clearVoiceCache();
            setTimeout(() => performTTSPlayback(text, messageId), 500);
            return;
          } catch (fallbackError) {
            console.error('❌ Fallback attempt failed:', fallbackError);
          }
        }
        
        // Handle specific errors with user-friendly messages
        let errorMessage = '';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = isMobile 
              ? 'Toca el botón de reproducir para escuchar respuestas'
              : 'Síntesis de voz no permitida. Toca para reproducir manualmente.';
            setCanAutoPlay(false);
            break;
          case 'network':
            errorMessage = 'Error de red al reproducir voz - usando voz del sistema';
            break;
          case 'synthesis-unavailable':
            errorMessage = 'Síntesis de voz no disponible en este dispositivo';
            break;
          case 'interrupted':
            // Don't show error for intentional interruptions
            break;
          default:
            errorMessage = `Error de síntesis con ${voiceResult.name} (Tier ${voiceResult.tier}) - intentando fallback`;
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
      
      // Platform-specific playback logic
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
      
      console.log(`🎵 TTS playback initiated with ${voiceResult.name} (${isMobile ? 'mobile' : 'desktop'})`);
      
    } catch (error) {
      console.error('❌ Failed to start TTS:', error);
      setError(isMobile ? 'Toca el botón de reproducir para escuchar' : 'No se pudo reproducir el audio');
      setCanAutoPlay(false);
      isProcessingRef.current = false;
      setIsInitializing(false);
    }
  }, [cleanTextForSpeech, selectUniversalVoice, language, rate, pitch, volume, isMobile]);

  // Main speak function with progressive fallback
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
      // Desktop handling with voice loading check
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
        fallbackAttemptRef.current = 0;
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

  // Run voice audit with enhanced error handling
  const runVoiceAudit = useCallback(async (): Promise<VoiceAuditSummary> => {
    try {
      console.log('🔍 Running enhanced voice audit...');
      setAuditError(null);
      const summary = await performVoiceAudit();
      setVoiceAudit(summary);
      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice audit failed';
      setAuditError(errorMessage);
      console.error('❌ Voice audit error:', error);
      throw error;
    }
  }, []);

  // Initialize on mount with enhanced audit
  useEffect(() => {
    const initializeWithAudit = async () => {
      await initializeAudioContext();
      // Run voice audit on initialization
      try {
        await runVoiceAudit();
        // Pre-select the best voice
        await selectUniversalVoice();
      } catch (error) {
        console.warn('⚠️ Initial voice setup failed, TTS may have limited functionality');
      }
    };
    
    initializeWithAudit();
  }, [initializeAudioContext, runVoiceAudit, selectUniversalVoice]);

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
    currentVoiceInfo,
    canAutoPlay,
    requestPlayPermission,
    isMobile,
    voiceAudit,
    runVoiceAudit,
    auditError
  };
};
