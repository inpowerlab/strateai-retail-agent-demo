
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, RotateCcw, Square, Settings } from 'lucide-react';
import { GoogleTTSVoiceSelector } from './GoogleTTSVoiceSelector';
import { useGoogleTTS } from '@/hooks/useGoogleTTS';

interface UniversalTTSControlsProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  className?: string;
}

export const UniversalTTSControls: React.FC<UniversalTTSControlsProps> = ({
  selectedVoice,
  onVoiceChange,
  className = ""
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [testText] = useState("¡Hola! Esta es una prueba de la voz premium de Google Cloud.");
  
  const {
    speak,
    stop,
    isPlaying,
    isInitializing,
    error,
    currentMethod,
    currentVoice
  } = useGoogleTTS({ voice: selectedVoice });

  const handleTestVoice = async () => {
    await speak(testText);
  };

  const getMethodBadge = () => {
    if (!currentMethod) return null;
    
    return (
      <Badge variant={currentMethod === 'google' ? 'default' : 'secondary'} className="ml-2">
        {currentMethod === 'google' ? '🌩️ Google Cloud' : '🌐 Browser'}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Control de Voz Premium</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {currentVoice && (
          <div className="flex items-center text-sm text-muted-foreground">
            <span>Activa: {currentVoice}</span>
            {getMethodBadge()}
          </div>
        )}
        
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            ⚠️ {error}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {showSettings && (
          <GoogleTTSVoiceSelector
            selectedVoice={selectedVoice}
            onVoiceChange={onVoiceChange}
          />
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={handleTestVoice}
            disabled={isPlaying || isInitializing}
            className="flex-1"
          >
            {isInitializing ? (
              <>⏳ Preparando...</>
            ) : isPlaying ? (
              <>🔊 Reproduciendo...</>
            ) : (
              <>🎤 Probar Voz</>
            )}
          </Button>
          
          {isPlaying && (
            <Button
              onClick={stop}
              variant="outline"
              size="icon"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          💡 Sistema inteligente: Google Cloud TTS premium con fallback automático al navegador
        </div>
      </CardContent>
    </Card>
  );
};
