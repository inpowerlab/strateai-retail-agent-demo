
import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onStopSpeaking,
  onReplay,
  onToggleMute,
  className = ""
}) => {
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
            {speechInitializing ? 'Iniciando micrófono...' : 'Te estoy escuchando'}
          </span>
        </div>
      )}

      {/* Enhanced Speaking Indicator with POS-friendly controls */}
      {(isSpeaking || ttsInitializing) && (
        <div className="flex items-center gap-3 text-green-600 bg-green-50 px-4 py-2 rounded-full border-2 border-green-200 shadow-lg">
          <div className="relative">
            <Volume2 className="h-7 w-7 text-green-600 animate-pulse" />
            <div className="absolute -inset-2 bg-green-400/30 rounded-full animate-ping" />
            <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-pulse" />
          </div>
          <span className="text-lg font-bold text-green-700">
            {ttsInitializing ? 'Preparando respuesta...' : 'Reproduciendo respuesta'}
          </span>
          
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
      {ttsSupported && currentVoiceInfo && (
        <div className="bg-muted/50 px-4 py-2 rounded-lg border">
          <VoiceStatusIndicator 
            voiceInfo={currentVoiceInfo} 
            compact={true}
          />
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

      {/* Voice Not Available Message - Enhanced for POS */}
      {!speechSupported && !ttsSupported && (
        <div className="text-base font-medium text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border">
          Funciones de voz no disponibles
        </div>
      )}
    </div>
  );
};
