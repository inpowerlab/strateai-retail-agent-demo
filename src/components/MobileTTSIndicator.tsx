
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Square, Smartphone, Wifi } from 'lucide-react';

interface MobileTTSIndicatorProps {
  isPlaying: boolean;
  isInitializing: boolean;
  isMobile: boolean;
  isAudioUnlocked: boolean;
  currentMethod: 'google' | 'browser' | null;
  currentVoice: string | null;
  error: string | null;
  onStop?: () => void;
  onUnlock?: () => void;
}

export const MobileTTSIndicator: React.FC<MobileTTSIndicatorProps> = ({
  isPlaying,
  isInitializing,
  isMobile,
  isAudioUnlocked,
  currentMethod,
  currentVoice,
  error,
  onStop,
  onUnlock
}) => {
  const getStatusBadge = () => {
    if (!isAudioUnlocked && isMobile) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          <Smartphone className="h-3 w-3 mr-1" />
          Audio Bloqueado
        </Badge>
      );
    }
    
    if (isInitializing) {
      return (
        <Badge variant="secondary" className="animate-pulse">
          <Wifi className="h-3 w-3 mr-1 animate-spin" />
          Iniciando...
        </Badge>
      );
    }
    
    if (isPlaying && currentMethod) {
      return (
        <Badge variant="default" className="bg-green-600">
          <Volume2 className="h-3 w-3 mr-1 animate-pulse" />
          {currentMethod === 'google' ? 'Google Cloud' : 'Navegador'}
        </Badge>
      );
    }
    
    if (isAudioUnlocked) {
      return (
        <Badge variant="outline">
          <Volume2 className="h-3 w-3 mr-1" />
          Audio Listo
        </Badge>
      );
    }
    
    return null;
  };

  const getMethodInfo = () => {
    if (currentVoice && (isPlaying || currentMethod)) {
      return (
        <div className="text-xs text-muted-foreground">
          🎵 {currentVoice}
          {isMobile && <span className="ml-1">📱</span>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      {getStatusBadge()}
      
      {error && (
        <Badge variant="destructive" className="text-xs">
          ⚠️ {error.substring(0, 30)}
        </Badge>
      )}
      
      {!isAudioUnlocked && isMobile && onUnlock && (
        <Button
          size="sm"
          variant="outline"
          onClick={onUnlock}
          className="h-6 text-xs"
        >
          <Volume2 className="h-3 w-3 mr-1" />
          Activar
        </Button>
      )}
      
      {isPlaying && onStop && (
        <Button
          size="sm"
          variant="outline"
          onClick={onStop}
          className="h-6 text-xs text-red-600 hover:text-red-700"
        >
          <Square className="h-3 w-3 fill-current" />
        </Button>
      )}
      
      <div className="flex-1">
        {getMethodInfo()}
      </div>
      
      {isMobile && (
        <div className="text-xs text-muted-foreground">
          📱 Móvil
        </div>
      )}
    </div>
  );
};
