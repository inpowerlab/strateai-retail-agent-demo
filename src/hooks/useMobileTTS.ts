
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MobileTTSState {
  isAudioUnlocked: boolean;
  isPlaying: boolean;
  isInitializing: boolean;
  error: string | null;
  requiresUserGesture: boolean;
  isMobile: boolean;
  audioContext: AudioContext | null;
  currentMethod: 'google' | 'browser' | null;
  currentVoice: string | null;
}

interface TTSResult {
  success: boolean;
  method: 'google' | 'browser' | 'failed';
  error?: string;
  requiresGesture?: boolean;
}

export const useMobileTTS = () => {
  const [state, setState] = useState<MobileTTSState>({
    isAudioUnlocked: false,
    isPlaying: false,
    isInitializing: false,
    error: null,
    requiresUserGesture: false,
    isMobile: false,
    audioContext: null,
    currentMethod: null,
    currentVoice: null
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pendingTextRef = useRef<string | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                            (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
                            window.innerWidth <= 768;
      
      setState(prev => ({ ...prev, isMobile: isMobileDevice }));
      
      if (isMobileDevice) {
        console.log('📱 Mobile device detected - audio unlock required');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize audio context with user gesture
  const initializeAudioContext = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔓 Initializing audio context with user gesture');
      
      // Create or resume audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        throw new Error('AudioContext not supported');
      }

      let audioContext = state.audioContext;
      if (!audioContext) {
        audioContext = new AudioContext();
        console.log('🎵 Created new AudioContext');
      }

      // Critical: Resume if suspended (required on mobile)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('▶️ Resumed suspended AudioContext');
      }

      const isUnlocked = audioContext.state === 'running';
      
      setState(prev => ({
        ...prev,
        audioContext,
        isAudioUnlocked: isUnlocked,
        requiresUserGesture: !isUnlocked,
        error: isUnlocked ? null : 'Audio context still locked'
      }));

      console.log(`🎵 Audio context state: ${audioContext.state}, Unlocked: ${isUnlocked}`);
      
      // If we have pending text and audio is now unlocked, play it
      if (isUnlocked && pendingTextRef.current) {
        const textToPlay = pendingTextRef.current;
        pendingTextRef.current = null;
        setTimeout(() => playTTS(textToPlay), 100);
      }

      return isUnlocked;
      
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
      setState(prev => ({
        ...prev,
        error: `Audio initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requiresUserGesture: true
      }));
      return false;
    }
  }, [state.audioContext]);

  // Play with Google Cloud TTS
  const playWithGoogle = useCallback(async (text: string): Promise<TTSResult> => {
    try {
      console.log('🌩️ Attempting Google Cloud TTS playback');
      
      const { data, error } = await supabase.functions.invoke('google-cloud-tts', {
        body: {
          text,
          voice: 'es-US-Journey-F',
          speed: 1.0,
          pitch: 0.0
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Google TTS failed');
      }

      // Create and play audio
      const audio = new Audio();
      audioRef.current = audio;
      
      return new Promise((resolve) => {
        audio.oncanplaythrough = () => {
          console.log('🔊 Google TTS audio ready for playback');
          setState(prev => ({
            ...prev,
            isPlaying: true,
            isInitializing: false,
            currentMethod: 'google',
            currentVoice: 'Journey (Google Cloud)',
            error: null
          }));
        };

        audio.onended = () => {
          console.log('✅ Google TTS playback completed');
          setState(prev => ({
            ...prev,
            isPlaying: false,
            currentMethod: null
          }));
          resolve({ success: true, method: 'google' });
        };

        audio.onerror = (e) => {
          console.error('❌ Google TTS audio error:', e);
          setState(prev => ({ ...prev, isPlaying: false, isInitializing: false }));
          resolve({ success: false, method: 'failed', error: 'Audio playback failed' });
        };

        // Set source and attempt playback
        audio.src = `data:audio/mp3;base64,${data.audioData}`;
        audio.play().catch((playError) => {
          console.error('❌ Audio play() failed:', playError);
          resolve({ 
            success: false, 
            method: 'failed', 
            error: playError.message,
            requiresGesture: playError.name === 'NotAllowedError'
          });
        });
      });

    } catch (error) {
      console.error('❌ Google TTS error:', error);
      return { 
        success: false, 
        method: 'failed', 
        error: error instanceof Error ? error.message : 'Google TTS failed' 
      };
    }
  }, []);

  // Browser TTS fallback
  const playWithBrowser = useCallback(async (text: string): Promise<TTSResult> => {
    try {
      console.log('🗣️ Using browser TTS fallback');
      
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(voice => 
        voice.lang.startsWith('es') && 
        (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('maria'))
      ) || voices.find(voice => voice.lang.startsWith('es')) || voices[0];

      if (!spanishVoice) {
        throw new Error('No suitable voice found');
      }

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        
        utterance.voice = spanishVoice;
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        utterance.onstart = () => {
          console.log(`🎵 Browser TTS started with ${spanishVoice.name}`);
          setState(prev => ({
            ...prev,
            isPlaying: true,
            isInitializing: false,
            currentMethod: 'browser',
            currentVoice: `${spanishVoice.name} (Browser)`,
            error: null
          }));
        };

        utterance.onend = () => {
          console.log('✅ Browser TTS completed');
          setState(prev => ({
            ...prev,
            isPlaying: false,
            currentMethod: null
          }));
          resolve({ success: true, method: 'browser' });
        };

        utterance.onerror = (e) => {
          console.error('❌ Browser TTS error:', e.error);
          setState(prev => ({ ...prev, isPlaying: false, isInitializing: false }));
          resolve({ 
            success: false, 
            method: 'failed', 
            error: `Browser TTS failed: ${e.error}`,
            requiresGesture: e.error === 'not-allowed'
          });
        };

        window.speechSynthesis.speak(utterance);
      });

    } catch (error) {
      console.error('❌ Browser TTS error:', error);
      return { 
        success: false, 
        method: 'failed', 
        error: error instanceof Error ? error.message : 'Browser TTS failed' 
      };
    }
  }, []);

  // Main TTS function
  const playTTS = useCallback(async (text: string): Promise<void> => {
    if (!text?.trim()) return;

    console.log(`🎯 TTS Request: "${text.substring(0, 50)}..." (Mobile: ${state.isMobile})`);

    // Check if audio is unlocked (critical for mobile)
    if (state.isMobile && !state.isAudioUnlocked) {
      console.log('📱 Mobile audio locked - storing text for later playback');
      pendingTextRef.current = text;
      setState(prev => ({
        ...prev,
        requiresUserGesture: true,
        error: 'Toca cualquier botón para habilitar el audio'
      }));
      return;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Try Google Cloud TTS first
      const googleResult = await playWithGoogle(text);
      
      if (googleResult.success) {
        console.log('✅ Google Cloud TTS succeeded');
        return;
      }

      // Handle gesture requirement
      if (googleResult.requiresGesture) {
        console.log('📱 Google TTS requires user gesture');
        pendingTextRef.current = text;
        setState(prev => ({
          ...prev,
          requiresUserGesture: true,
          isInitializing: false,
          error: 'Toca para activar el audio'
        }));
        return;
      }

      // Fallback to browser TTS
      console.log('🔄 Falling back to browser TTS');
      const browserResult = await playWithBrowser(text);
      
      if (!browserResult.success) {
        if (browserResult.requiresGesture) {
          pendingTextRef.current = text;
          setState(prev => ({
            ...prev,
            requiresUserGesture: true,
            isInitializing: false,
            error: 'Toca para activar el audio'
          }));
        } else {
          setState(prev => ({
            ...prev,
            isInitializing: false,
            error: `TTS failed: ${browserResult.error}`
          }));
        }
      }

    } catch (error) {
      console.error('❌ TTS playback failed:', error);
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: `TTS error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }, [state.isMobile, state.isAudioUnlocked, playWithGoogle, playWithBrowser]);

  // Stop current playback
  const stopTTS = useCallback(() => {
    console.log('🛑 Stopping TTS playback');
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isInitializing: false
    }));
  }, []);

  // Handle user gesture (unlock audio)
  const handleUserGesture = useCallback(async () => {
    console.log('👆 User gesture detected - attempting to unlock audio');
    
    const unlocked = await initializeAudioContext();
    
    if (unlocked) {
      setState(prev => ({
        ...prev,
        requiresUserGesture: false,
        error: null
      }));
    }
  }, [initializeAudioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.audioContext && state.audioContext.state !== 'closed') {
        state.audioContext.close();
      }
    };
  }, [state.audioContext]);

  return {
    ...state,
    playTTS,
    stopTTS,
    handleUserGesture,
    initializeAudioContext
  };
};
