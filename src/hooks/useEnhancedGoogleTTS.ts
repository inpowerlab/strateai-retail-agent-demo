
import { useState, useCallback, useRef, useEffect } from 'react';
import { selectBestVoice, VoiceSelectionResult } from '@/utils/voiceSelection';
import { useTTSAudit } from './useTTSAudit';

interface EnhancedTTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  enableFallback?: boolean;
  auditMode?: boolean;
}

interface EnhancedTTSResult {
  success: boolean;
  method: 'google' | 'browser' | 'failed';
  voice?: string;
  error?: string;
  fallbackUsed?: boolean;
  latency?: number;
  auditReport?: any;
}

export const useEnhancedGoogleTTS = (options: EnhancedTTSOptions = {}) => {
  const {
    voice = 'es-US-Journey-F',
    speed = 1.0,
    pitch = 0.0,
    enableFallback = true,
    auditMode = false
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMethod, setCurrentMethod] = useState<'google' | 'browser' | null>(null);
  const [currentVoice, setCurrentVoice] = useState<string | null>(null);
  const [lastPlayedText, setLastPlayedText] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fallbackVoiceRef = useRef<VoiceSelectionResult | null>(null);

  const audit = useTTSAudit();

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    
    setIsPlaying(false);
    setIsInitializing(false);
  }, []);

  const playWithGoogle = useCallback(async (text: string): Promise<EnhancedTTSResult> => {
    try {
      console.log('🎤 [Enhanced Google TTS] Starting premium voice playback');
      
      // Log Edge Function call with audit
      const { data, error: functionError } = await audit.logEdgeFunctionCall(text, voice);

      if (functionError || !data) {
        const errorMsg = functionError?.message || 'Failed to call Google TTS function';
        audit.logFallbackTrigger(errorMsg, 'browser');
        throw new Error(errorMsg);
      }

      if (!data.success) {
        const shouldFallback = data.fallbackRequired;
        audit.logFallbackTrigger(data.error || 'Google TTS failed', 'browser');
        
        if (shouldFallback && enableFallback) {
          return { success: false, method: 'failed', error: data.error, fallbackUsed: true };
        }
        
        throw new Error(data.error || 'Google TTS generation failed');
      }

      // Process audio with audit logging
      const audio = audit.logAudioProcessing(data.audioData);
      audioRef.current = audio;
      
      return new Promise((resolve) => {
        const endPlayback = audit.logPlaybackStart('google', `${voice} (Google Cloud)`);
        
        audio.onloadeddata = () => {
          console.log('🔊 [Enhanced Google TTS] Audio loaded, starting playback');
          setCurrentMethod('google');
          setCurrentVoice(`${voice} (Google Cloud Premium)`);
          setIsPlaying(true);
          setIsInitializing(false);
        };

        audio.onended = () => {
          console.log('✅ [Enhanced Google TTS] Playback completed');
          endPlayback();
          cleanup();
          
          const auditReport = audit.completeAudit(true, `${voice} (Google Cloud)`);
          resolve({ 
            success: true, 
            method: 'google', 
            voice: voice,
            latency: auditReport?.metrics.totalLatency,
            auditReport 
          });
        };

        audio.onerror = (e) => {
          console.error('❌ [Enhanced Google TTS] Audio playback error:', e);
          endPlayback();
          cleanup();
          
          const auditReport = audit.completeAudit(false, 'Failed');
          resolve({ 
            success: false, 
            method: 'failed', 
            error: 'Audio playback failed',
            fallbackUsed: enableFallback,
            auditReport
          });
        };

        audio.play().catch((playError) => {
          console.error('❌ [Enhanced Google TTS] Play failed:', playError);
          endPlayback();
          cleanup();
          
          const auditReport = audit.completeAudit(false, 'Failed');
          resolve({ 
            success: false, 
            method: 'failed', 
            error: playError.message,
            fallbackUsed: enableFallback,
            auditReport
          });
        });
      });

    } catch (error) {
      console.error('❌ [Enhanced Google TTS] Error:', error);
      const auditReport = audit.completeAudit(false, 'Failed');
      return { 
        success: false, 
        method: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: enableFallback,
        auditReport
      };
    }
  }, [voice, speed, pitch, enableFallback, audit, cleanup]);

  const playWithBrowser = useCallback(async (text: string): Promise<EnhancedTTSResult> => {
    try {
      console.log('🗣️ [Enhanced Browser TTS] Starting fallback playback');
      
      // Audit browser voices
      const voiceAudit = audit.auditBrowserVoices();
      
      if (!fallbackVoiceRef.current) {
        fallbackVoiceRef.current = await selectBestVoice({
          preferredLanguage: 'es-ES',
          requireSpanish: true,
          requireFemale: true,
          allowFallback: true
        });
      }

      const voiceResult = fallbackVoiceRef.current;
      
      if (!voiceResult.voice) {
        throw new Error('No voices available for fallback TTS');
      }

      // Critical: Check if selected voice is actually female
      const isFemaleVoice = voiceResult.voice.name.toLowerCase().includes('female') ||
                          voiceResult.voice.name.toLowerCase().includes('mujer') ||
                          voiceResult.voice.name.toLowerCase().includes('maria') ||
                          voiceResult.voice.name.toLowerCase().includes('carmen');

      if (!isFemaleVoice) {
        console.warn('⚠️ [Enhanced Browser TTS] CRITICAL: Selected voice may not be female:', voiceResult.voice.name);
      }

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        
        utterance.voice = voiceResult.voice;
        utterance.rate = speed;
        utterance.pitch = 1 + (pitch / 10);
        utterance.volume = 0.8;
        utterance.lang = 'es-ES';

        const endPlayback = audit.logPlaybackStart('browser', voiceResult.name);

        utterance.onstart = () => {
          console.log(`🎵 [Enhanced Browser TTS] Started with ${voiceResult.name} (Tier ${voiceResult.tier})`);
          setCurrentMethod('browser');
          setCurrentVoice(`${voiceResult.name} (Browser Fallback)`);
          setIsPlaying(true);
          setIsInitializing(false);
        };

        utterance.onend = () => {
          console.log('✅ [Enhanced Browser TTS] Playback completed');
          endPlayback();
          cleanup();
          
          const auditReport = audit.completeAudit(true, voiceResult.name);
          resolve({ 
            success: true, 
            method: 'browser', 
            voice: voiceResult.name,
            fallbackUsed: true,
            latency: auditReport?.metrics.totalLatency,
            auditReport
          });
        };

        utterance.onerror = (e) => {
          console.error('❌ [Enhanced Browser TTS] Error:', e.error);
          endPlayback();
          cleanup();
          
          const auditReport = audit.completeAudit(false, 'Failed');
          resolve({ 
            success: false, 
            method: 'failed', 
            error: `Browser TTS failed: ${e.error}`,
            fallbackUsed: true,
            auditReport
          });
        };

        window.speechSynthesis.speak(utterance);
      });

    } catch (error) {
      console.error('❌ [Enhanced Browser TTS] Error:', error);
      const auditReport = audit.completeAudit(false, 'Failed');
      return { 
        success: false, 
        method: 'failed', 
        error: error instanceof Error ? error.message : 'Browser TTS failed',
        auditReport
      };
    }
  }, [speed, pitch, audit, cleanup]);

  const speak = useCallback(async (text: string): Promise<EnhancedTTSResult> => {
    if (!text?.trim()) {
      return { success: false, method: 'failed', error: 'No text provided' };
    }

    cleanup();
    
    setIsInitializing(true);
    setError(null);
    setLastPlayedText(text);

    // Start audit if enabled
    if (auditMode) {
      audit.startAudit(voice);
    }

    console.log('🎯 [Enhanced Universal TTS] Starting with Google Cloud premium, browser fallback enabled');

    try {
      // Always try Google Cloud TTS first
      const googleResult = await playWithGoogle(text);
      
      if (googleResult.success) {
        console.log('✅ [Enhanced Universal TTS] Google Cloud TTS succeeded');
        return googleResult;
      }

      // If Google failed and fallback is enabled, try browser TTS
      if (enableFallback && googleResult.fallbackUsed) {
        console.log('🔄 [Enhanced Universal TTS] Falling back to browser TTS');
        const browserResult = await playWithBrowser(text);
        
        if (browserResult.success) {
          console.log('✅ [Enhanced Universal TTS] Browser TTS fallback succeeded');
          return browserResult;
        }
        
        // Both failed
        const errorMessage = `Both Google and browser TTS failed. Google: ${googleResult.error}, Browser: ${browserResult.error}`;
        setError(errorMessage);
        return { success: false, method: 'failed', error: errorMessage };
      }

      // Only Google attempted, fallback disabled
      setError(googleResult.error || 'TTS failed');
      return googleResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
      console.error('❌ [Enhanced Universal TTS] Unexpected error:', error);
      setError(errorMessage);
      cleanup();
      return { success: false, method: 'failed', error: errorMessage };
    }
  }, [playWithGoogle, playWithBrowser, enableFallback, cleanup, auditMode, audit, voice]);

  const stop = useCallback(() => {
    console.log('🛑 [Enhanced Universal TTS] Stopping playback');
    cleanup();
  }, [cleanup]);

  const replay = useCallback(async (): Promise<EnhancedTTSResult | null> => {
    if (!lastPlayedText) {
      console.warn('⚠️ [Enhanced Universal TTS] No text to replay');
      return null;
    }
    
    console.log('🔄 [Enhanced Universal TTS] Replaying last message');
    return await speak(lastPlayedText);
  }, [lastPlayedText, speak]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    speak,
    stop,
    replay,
    isPlaying,
    isInitializing,
    error,
    currentMethod,
    currentVoice,
    lastPlayedText,
    // Enhanced audit capabilities
    auditReports: audit.auditReports,
    getLatestAuditReport: audit.getLatestReport,
    clearAuditReports: audit.clearReports,
    auditBrowserVoices: audit.auditBrowserVoices,
    isAuditing: audit.isAuditing
  };
};
