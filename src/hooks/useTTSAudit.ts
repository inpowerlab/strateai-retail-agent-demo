
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TTSPerformanceMetrics {
  startTime: number;
  edgeFunctionLatency?: number;
  googleApiLatency?: number;
  audioProcessingTime?: number;
  playbackLatency?: number;
  totalLatency?: number;
  voiceUsed?: string;
  method: 'google' | 'browser' | 'failed';
  fallbackReason?: string;
  errors?: string[];
}

interface TTSAuditReport {
  timestamp: string;
  userAgent: string;
  metrics: TTSPerformanceMetrics;
  voiceSelection: {
    requestedVoice: string;
    actualVoice: string;
    availableVoices: string[];
    fallbackChain: string[];
  };
  success: boolean;
  recommendations: string[];
}

export const useTTSAudit = () => {
  const [auditReports, setAuditReports] = useState<TTSAuditReport[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const currentMetrics = useRef<TTSPerformanceMetrics | null>(null);

  const startAudit = useCallback((requestedVoice: string = 'es-US-Journey-F') => {
    setIsAuditing(true);
    currentMetrics.current = {
      startTime: Date.now(),
      method: 'google',
      errors: []
    };
    
    console.log('🔍 [TTS AUDIT] Starting comprehensive TTS audit', {
      requestedVoice,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  }, []);

  const logEdgeFunctionCall = useCallback(async (text: string, voice: string) => {
    if (!currentMetrics.current) return;
    
    const edgeFunctionStart = Date.now();
    console.log('🚀 [TTS AUDIT] Edge Function call initiated', {
      textLength: text.length,
      voice,
      timestamp: new Date().toISOString()
    });

    try {
      const { data, error } = await supabase.functions.invoke('google-cloud-tts', {
        body: { text, voice, speed: 1.0, pitch: 0.0 }
      });

      currentMetrics.current.edgeFunctionLatency = Date.now() - edgeFunctionStart;
      
      console.log('📊 [TTS AUDIT] Edge Function response', {
        latency: currentMetrics.current.edgeFunctionLatency,
        success: !error && data?.success,
        error: error?.message || data?.error,
        fallbackRequired: data?.fallbackRequired
      });

      if (error || !data?.success) {
        currentMetrics.current.errors?.push(`Edge Function: ${error?.message || data?.error}`);
        currentMetrics.current.fallbackReason = error?.message || data?.error;
      }

      return { data, error };
    } catch (err) {
      currentMetrics.current.edgeFunctionLatency = Date.now() - edgeFunctionStart;
      currentMetrics.current.errors?.push(`Edge Function Exception: ${err}`);
      currentMetrics.current.fallbackReason = `Exception: ${err}`;
      console.error('❌ [TTS AUDIT] Edge Function exception', err);
      return { data: null, error: err };
    }
  }, []);

  const logAudioProcessing = useCallback((audioData: string) => {
    if (!currentMetrics.current) return;
    
    const processingStart = Date.now();
    console.log('🎵 [TTS AUDIT] Audio processing started', {
      audioDataSize: audioData.length,
      timestamp: new Date().toISOString()
    });

    // Simulate audio processing time measurement
    const audio = new Audio();
    audio.src = `data:audio/mp3;base64,${audioData}`;
    
    currentMetrics.current.audioProcessingTime = Date.now() - processingStart;
    
    console.log('📈 [TTS AUDIT] Audio processing completed', {
      processingTime: currentMetrics.current.audioProcessingTime,
      audioSrc: audio.src.substring(0, 100) + '...'
    });

    return audio;
  }, []);

  const logPlaybackStart = useCallback((method: 'google' | 'browser', voiceName: string) => {
    if (!currentMetrics.current) return;
    
    const playbackStart = Date.now();
    currentMetrics.current.method = method;
    currentMetrics.current.voiceUsed = voiceName;
    
    console.log('🔊 [TTS AUDIT] Playback initiated', {
      method,
      voiceName,
      timestamp: new Date().toISOString()
    });

    return () => {
      if (currentMetrics.current) {
        currentMetrics.current.playbackLatency = Date.now() - playbackStart;
        currentMetrics.current.totalLatency = Date.now() - currentMetrics.current.startTime;
        
        console.log('✅ [TTS AUDIT] Playback completed', {
          playbackLatency: currentMetrics.current.playbackLatency,
          totalLatency: currentMetrics.current.totalLatency,
          method,
          voiceName
        });
      }
    };
  }, []);

  const logFallbackTrigger = useCallback((reason: string, targetMethod: 'browser') => {
    if (!currentMetrics.current) return;
    
    currentMetrics.current.fallbackReason = reason;
    currentMetrics.current.method = targetMethod;
    currentMetrics.current.errors?.push(`Fallback triggered: ${reason}`);
    
    console.warn('⚠️ [TTS AUDIT] Fallback triggered', {
      reason,
      targetMethod,
      timestamp: new Date().toISOString()
    });
  }, []);

  const auditBrowserVoices = useCallback(() => {
    const voices = speechSynthesis.getVoices();
    const spanishVoices = voices.filter(v => v.lang.includes('es'));
    const femaleSpanishVoices = spanishVoices.filter(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('mujer') ||
      v.name.toLowerCase().includes('maria') ||
      v.name.toLowerCase().includes('carmen')
    );

    console.log('🗣️ [TTS AUDIT] Browser voice audit', {
      totalVoices: voices.length,
      spanishVoices: spanishVoices.length,
      femaleSpanishVoices: femaleSpanishVoices.length,
      spanishVoiceNames: spanishVoices.map(v => v.name),
      femaleSpanishVoiceNames: femaleSpanishVoices.map(v => v.name)
    });

    return {
      totalVoices: voices.length,
      spanishVoices: spanishVoices.map(v => v.name),
      femaleSpanishVoices: femaleSpanishVoices.map(v => v.name),
      allVoices: voices.map(v => ({ name: v.name, lang: v.lang, gender: v.name.toLowerCase() }))
    };
  }, []);

  const completeAudit = useCallback((success: boolean, actualVoice: string) => {
    if (!currentMetrics.current) return;

    const browserVoiceInfo = auditBrowserVoices();
    const totalLatency = Date.now() - currentMetrics.current.startTime;
    
    const report: TTSAuditReport = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      metrics: {
        ...currentMetrics.current,
        totalLatency,
        voiceUsed: actualVoice
      },
      voiceSelection: {
        requestedVoice: 'es-US-Journey-F',
        actualVoice,
        availableVoices: browserVoiceInfo.spanishVoices,
        fallbackChain: browserVoiceInfo.femaleSpanishVoices
      },
      success,
      recommendations: generateRecommendations(currentMetrics.current, totalLatency, success)
    };

    setAuditReports(prev => [...prev, report]);
    setIsAuditing(false);
    
    console.log('📋 [TTS AUDIT] Audit completed', report);
    return report;
  }, [auditBrowserVoices]);

  const generateRecommendations = (metrics: TTSPerformanceMetrics, totalLatency: number, success: boolean): string[] => {
    const recommendations: string[] = [];

    if (totalLatency > 2000) {
      recommendations.push('HIGH LATENCY: Total response time exceeds 2 seconds');
      
      if (metrics.edgeFunctionLatency && metrics.edgeFunctionLatency > 1000) {
        recommendations.push('Edge Function latency is high - check network or API performance');
      }
      
      if (metrics.audioProcessingTime && metrics.audioProcessingTime > 500) {
        recommendations.push('Audio processing time is high - consider audio format optimization');
      }
    }

    if (metrics.method === 'browser' && !metrics.fallbackReason) {
      recommendations.push('CRITICAL: Browser fallback used without documented Google TTS failure');
    }

    if (metrics.method === 'browser' && metrics.voiceUsed && !metrics.voiceUsed.toLowerCase().includes('female')) {
      recommendations.push('CRITICAL: Non-female voice selected - voice selection logic needs review');
    }

    if (metrics.errors && metrics.errors.length > 0) {
      recommendations.push('ERRORS DETECTED: Review error logs for root cause analysis');
    }

    if (!success) {
      recommendations.push('TTS FAILURE: Complete system failure - implement emergency fallback');
    }

    return recommendations;
  };

  const getLatestReport = useCallback(() => {
    return auditReports[auditReports.length - 1] || null;
  }, [auditReports]);

  const clearReports = useCallback(() => {
    setAuditReports([]);
  }, []);

  return {
    startAudit,
    logEdgeFunctionCall,
    logAudioProcessing,
    logPlaybackStart,
    logFallbackTrigger,
    completeAudit,
    auditBrowserVoices,
    getLatestReport,
    clearReports,
    auditReports,
    isAuditing
  };
};
