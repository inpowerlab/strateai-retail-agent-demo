
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechToText } from './useSpeechToText';
import { useMobileTTS } from './useMobileTTS';

interface MobileVoiceManagerState {
  isVoiceActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isAudioUnlocked: boolean;
  error: string | null;
  lastAction: 'none' | 'listening' | 'speaking' | 'processing';
  debugLogs: string[];
}

interface MobileVoiceManagerOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  autoStopOnSpeech?: boolean;
}

export const useMobileVoiceManager = (options: MobileVoiceManagerOptions = {}) => {
  const { onTranscript, onError, autoStopOnSpeech = true } = options;
  
  const [state, setState] = useState<MobileVoiceManagerState>({
    isVoiceActive: false,
    isListening: false,
    isSpeaking: false,
    isAudioUnlocked: false,
    error: null,
    lastAction: 'none',
    debugLogs: []
  });

  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');

  // Initialize STT
  const {
    isListening: sttListening,
    transcript,
    error: sttError,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: sttSupported,
    isInitializing: sttInitializing,
    hasPermission: micPermission
  } = useSpeechToText({
    maxRecordingTime: 30000,
    silenceTimeout: 4000
  });

  // Initialize TTS
  const {
    isAudioUnlocked: ttsUnlocked,
    isPlaying: ttsPlaying,
    isInitializing: ttsInitializing,
    error: ttsError,
    requiresUserGesture,
    isMobile,
    currentMethod,
    currentVoice,
    playTTS,
    stopTTS,
    handleUserGesture
  } = useMobileTTS();

  // Add debug logging
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString().substr(11, 12);
    const logEntry = `[${timestamp}] ${message}`;
    console.log(`📱 MobileVoice: ${logEntry}`);
    
    setState(prev => ({
      ...prev,
      debugLogs: [...prev.debugLogs.slice(-20), logEntry] // Keep last 20 logs
    }));
  }, []);

  // Sync state with individual hook states
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isListening: sttListening || sttInitializing,
      isSpeaking: ttsPlaying || ttsInitializing,
      isAudioUnlocked: ttsUnlocked && micPermission,
      isVoiceActive: sttListening || sttInitializing || ttsPlaying || ttsInitializing,
      error: sttError || ttsError || null
    }));
  }, [sttListening, sttInitializing, ttsPlaying, ttsInitializing, ttsUnlocked, micPermission, sttError, ttsError]);

  // Handle transcript changes
  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current && transcript.length > 3) {
      lastTranscriptRef.current = transcript;
      addDebugLog(`Transcript received: "${transcript}"`);
      
      // Auto-stop listening if we have speech and auto-stop is enabled
      if (autoStopOnSpeech && sttListening) {
        addDebugLog('Auto-stopping listening due to speech detection');
        stopListening();
      }
      
      // Pass transcript to callback
      if (onTranscript) {
        onTranscript(transcript);
      }
      
      // Reset transcript after processing
      setTimeout(() => {
        resetTranscript();
        lastTranscriptRef.current = '';
      }, 500);
    }
  }, [transcript, sttListening, autoStopOnSpeech, stopListening, resetTranscript, onTranscript, addDebugLog]);

  // Handle errors
  useEffect(() => {
    const currentError = sttError || ttsError;
    if (currentError && onError) {
      addDebugLog(`Error occurred: ${currentError}`);
      onError(currentError);
    }
  }, [sttError, ttsError, onError, addDebugLog]);

  // Universal user gesture handler
  const handleUniversalGesture = useCallback(async () => {
    addDebugLog('Universal gesture detected - unlocking audio systems');
    
    try {
      // Handle TTS gesture
      if (requiresUserGesture || !ttsUnlocked) {
        await handleUserGesture();
        addDebugLog('TTS audio context unlocked');
      }
      
      setState(prev => ({
        ...prev,
        lastAction: 'processing'
      }));
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Gesture handling failed: ${errorMessage}`);
      return false;
    }
  }, [requiresUserGesture, ttsUnlocked, handleUserGesture, addDebugLog]);

  // Start voice input with proper coordination
  const startVoiceInput = useCallback(async () => {
    addDebugLog('Starting voice input');
    
    // Stop any current TTS playback
    if (ttsPlaying) {
      addDebugLog('Stopping TTS before starting voice input');
      stopTTS();
    }
    
    // Ensure audio is unlocked
    if (!state.isAudioUnlocked) {
      const unlocked = await handleUniversalGesture();
      if (!unlocked) {
        addDebugLog('Failed to unlock audio for voice input');
        return false;
      }
    }
    
    // Clear any existing timeouts
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
    }
    
    setState(prev => ({ ...prev, lastAction: 'listening' }));
    
    try {
      await startListening();
      addDebugLog('Voice input started successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Failed to start voice input: ${errorMessage}`);
      return false;
    }
  }, [ttsPlaying, stopTTS, state.isAudioUnlocked, handleUniversalGesture, startListening, addDebugLog]);

  // Stop voice input
  const stopVoiceInput = useCallback(() => {
    addDebugLog('Stopping voice input');
    stopListening();
    setState(prev => ({ ...prev, lastAction: 'none' }));
  }, [stopListening, addDebugLog]);

  // Play TTS with coordination
  const playVoiceOutput = useCallback(async (text: string, messageId?: string) => {
    if (!text?.trim()) return false;
    
    addDebugLog(`Playing TTS: "${text.substring(0, 50)}..."`);
    
    // Stop any current listening
    if (sttListening) {
      addDebugLog('Stopping listening before TTS playback');
      stopListening();
    }
    
    // Ensure audio is unlocked
    if (!state.isAudioUnlocked) {
      const unlocked = await handleUniversalGesture();
      if (!unlocked) {
        addDebugLog('Audio not unlocked - TTS will be queued');
      }
    }
    
    setState(prev => ({ ...prev, lastAction: 'speaking' }));
    
    try {
      playTTS(text, messageId);
      addDebugLog('TTS playback initiated');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`TTS playback failed: ${errorMessage}`);
      return false;
    }
  }, [sttListening, stopListening, state.isAudioUnlocked, handleUniversalGesture, playTTS, addDebugLog]);

  // Stop TTS
  const stopVoiceOutput = useCallback(() => {
    addDebugLog('Stopping TTS playback');
    stopTTS();
    setState(prev => ({ ...prev, lastAction: 'none' }));
  }, [stopTTS, addDebugLog]);

  // Toggle voice input
  const toggleVoiceInput = useCallback(async () => {
    if (sttListening || sttInitializing) {
      stopVoiceInput();
    } else {
      await startVoiceInput();
    }
  }, [sttListening, sttInitializing, stopVoiceInput, startVoiceInput]);

  // Get current status
  const getVoiceStatus = useCallback(() => {
    if (sttInitializing) return 'Iniciando micrófono...';
    if (sttListening) return 'Escuchando...';
    if (ttsInitializing) return 'Preparando voz...';
    if (ttsPlaying) return 'Reproduciendo respuesta...';
    if (requiresUserGesture) return 'Toca para activar audio';
    if (!micPermission) return 'Permisos de micrófono requeridos';
    if (!ttsUnlocked) return 'Audio no desbloqueado';
    return 'Listo para usar voz';
  }, [sttInitializing, sttListening, ttsInitializing, ttsPlaying, requiresUserGesture, micPermission, ttsUnlocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Status
    isSupported: sttSupported,
    isMobile,
    currentVoice,
    currentMethod,
    voiceStatus: getVoiceStatus(),
    
    // Actions
    handleUniversalGesture,
    startVoiceInput,
    stopVoiceInput,
    toggleVoiceInput,
    playVoiceOutput,
    stopVoiceOutput,
    
    // Debug
    clearDebugLogs: () => setState(prev => ({ ...prev, debugLogs: [] }))
  };
};
