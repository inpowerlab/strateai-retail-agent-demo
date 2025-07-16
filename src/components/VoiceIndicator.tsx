
import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';
import { VoiceSelectionResult } from '@/utils/voiceSelection';

interface VoiceIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  speechInitializing: boolean;
  ttsInitializing: boolean;
  speechSupported: boolean;
  ttsSupported: boolean;
  isMuted: boolean;
  currentVoiceInfo?: VoiceSelectionResult | null;
  currentTTSMethod?: 'google' | 'openai' | 'browser' | null;
  currentVoiceName?: string | null;
  onStopSpeaking?: () => void;
  onReplay?: () => void;
  onToggleMute?: () => void;
  className?: string;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening,
  isSpeaking,
  speechInitializing,
  ttsInitializing,
  speechSupported,
  ttsSupported,
  isMuted,
  currentVoiceInfo,
  currentTTSMethod,
  currentVoiceName,
  onStopSpeaking,
  onReplay,
  onToggleMute,
  className = ""
}) => {
  const getTTSMethodBadge = () => {
    if (!currentTTSMethod) return null;
    
    const methodInfo = {
      google: { label: 'Google Cloud Premium', color: 'bg-purple-100 text-purple-700', icon: '🌩️' },
      openai: { label: 'OpenAI NOVA', color: 'bg-green-100 text-green-700', icon: '🤖' },
      browser: { label: 'Browser Fallback', color: 'bg-blue-100 text-blue-700', icon: '🌐' }
    };
    
    const info = methodInfo[currentTTSMethod];
    if (!info) return null;
    
    return (
      <Badge className={`${info.color} border-0 font-medium`}>
        {info.icon} {info.label}
      </Badge>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Enhanced Listening Indicator for POS visibility */}
      {(isListening || speechInitializing) && (
        <div className="flex items-center gap-3 text-blue-600 bg-blue-50 px-4 py-2 rounded-full border-2 border-blue-200 shadow-lg">
          <div className="relative">
            <Mic className="h-7 w-7 text-blue-600" />
            <div className="absolute -inset-2 bg-blue-400/30 rounded-full animate-ping" />
            <div className="absolute -inset-1 bg-blue-500/20 rounded-full animate-pulse" />
          </div>
          <span className="text-lg font-bold text-blue-700">
            {speechInitializing ? 'Iniciando micrófono...' : 'Te estoy escuchando • Whisper STT'}
          </span>
        </div>
      )}

      {/* Enhanced Speaking Indicator with method distinction */}
      {(isSpeaking || ttsInitializing) && (
        <div className="flex items-center gap-3 text-green-600 bg-green-50 px-4 py-2 rounded-full border-2 border-green-200 shadow-lg">
          <div className="relative">
            <Volume2 className="h-7 w-7 text-green-600 animate-pulse" />
            <div className="absolute -inset-2 bg-green-400/30 rounded-full animate-ping" />
            <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-green-700">
              {ttsInitializing ? 'Preparando respuesta...' : 'Reproduciendo'}
            </span>
            {currentVoiceName && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-600">{currentVoiceName}</span>
                {getTTSMethodBadge()}
              </div>
            )}
          </div>
          
          {/* Large Stop Button for POS */}
          {isSpeaking && onStopSpeaking && (
            <Button
              size="lg"
              variant="outline"
              onClick={onStopSpeaking}
              className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-2 border-red-300 shadow-md"
              title="Parar reproducción"
              aria-label="Parar reproducción de voz"
            >
              <Square className="h-5 w-5 fill-current" />
            </Button>
          )}
        </div>
      )}

      {/* Voice Status Display - Always visible when TTS is supported */}
      {ttsSupported && (currentVoiceInfo || currentVoiceName) && (
        <div className="bg-muted/50 px-4 py-2 rounded-lg border">
          {currentVoiceInfo ? (
            <VoiceStatusIndicator 
              voiceInfo={currentVoiceInfo} 
              compact={true}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currentVoiceName}</span>
              {getTTSMethodBadge()}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Audio Controls for POS */}
      {ttsSupported && !isSpeaking && !ttsInitializing && (
        <div className="flex items-center gap-2">
          {/* Large Replay Button */}
          {onReplay && (
            <Button
              size="lg"
              variant="outline"
              onClick={onReplay}
              className="h-12 w-12 p-0 text-muted-foreground hover:text-primary border-2 shadow-md"
              title="Repetir último mensaje"
              aria-label="Repetir último mensaje hablado"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          )}

          {/* Large Mute Toggle */}
          {onToggleMute && (
            <Button
              size="lg"
              variant="outline"
              onClick={onToggleMute}
              className="h-12 w-12 p-0 text-muted-foreground hover:text-primary border-2 shadow-md"
              title={isMuted ? 'Activar voz' : 'Silenciar voz'}
              aria-label={isMuted ? 'Activar síntesis de voz' : 'Silenciar síntesis de voz'}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      )}

      {/* Premium TTS Status Message */}
      {ttsSupported && (
        <div className="text-sm font-medium text-muted-foreground bg-primary/5 px-3 py-2 rounded-lg border border-primary/20">
          🎤 Sistema Premium: Google Cloud + OpenAI + Fallback Automático
        </div>
      )}

      {/* Voice Not Available Message - Enhanced for POS */}
      {!speechSupported && !ttsSupported && (
        <div className="text-base font-medium text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border">
          Funciones de voz no disponibles
        </div>
      )}
    </div>
  );
};
