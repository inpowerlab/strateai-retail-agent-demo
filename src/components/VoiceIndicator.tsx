
import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  speechInitializing: boolean;
  ttsInitializing: boolean;
  speechSupported: boolean;
  ttsSupported: boolean;
  isMuted: boolean;
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
  onStopSpeaking,
  onReplay,
  onToggleMute,
  className = ""
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Listening Indicator */}
      {(isListening || speechInitializing) && (
        <div className="flex items-center gap-2 text-blue-600 animate-pulse">
          <div className="relative">
            <Mic className="h-5 w-5" />
            <div className="absolute -inset-1 bg-blue-500/20 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-medium">
            {speechInitializing ? 'Iniciando...' : 'Escuchando'}
          </span>
        </div>
      )}

      {/* Speaking Indicator with Controls */}
      {(isSpeaking || ttsInitializing) && (
        <div className="flex items-center gap-2 text-green-600">
          <div className="relative">
            <Volume2 className="h-5 w-5 animate-pulse" />
            <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-medium">
            {ttsInitializing ? 'Preparando...' : 'Hablando'}
          </span>
          
          {/* Stop Button */}
          {isSpeaking && onStopSpeaking && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onStopSpeaking}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Parar reproducción"
              aria-label="Parar reproducción de voz"
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
          )}
        </div>
      )}

      {/* Audio Controls */}
      {ttsSupported && !isSpeaking && !ttsInitializing && (
        <div className="flex items-center gap-1">
          {/* Replay Button */}
          {onReplay && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onReplay}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              title="Repetir último mensaje"
              aria-label="Repetir último mensaje hablado"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}

          {/* Mute Toggle */}
          {onToggleMute && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleMute}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              title={isMuted ? 'Activar voz' : 'Silenciar voz'}
              aria-label={isMuted ? 'Activar síntesis de voz' : 'Silenciar síntesis de voz'}
            >
              {isMuted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      )}

      {/* Voice Not Supported Message */}
      {!speechSupported && !ttsSupported && (
        <div className="text-xs text-muted-foreground">
          Voz no disponible en este navegador
        </div>
      )}
    </div>
  );
};
