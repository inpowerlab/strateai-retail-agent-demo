
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2, Smartphone } from 'lucide-react';

interface MobileAudioUnlockProps {
  onUnlock: () => void;
  isMobile: boolean;
  requiresGesture: boolean;
  error?: string | null;
}

export const MobileAudioUnlock: React.FC<MobileAudioUnlockProps> = ({
  onUnlock,
  isMobile,
  requiresGesture,
  error
}) => {
  if (!requiresGesture) return null;

  return (
    <Card className="mx-4 mb-4 border-2 border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
            {isMobile ? (
              <Smartphone className="h-5 w-5 text-orange-600" />
            ) : (
              <Volume2 className="h-5 w-5 text-orange-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-800">Audio Bloqueado</h3>
            <p className="text-sm text-orange-700">
              {isMobile 
                ? 'Los navegadores móviles requieren un toque para habilitar el audio'
                : 'Se requiere interacción del usuario para reproducir audio'
              }
            </p>
          </div>
        </div>
        
        {error && (
          <div className="mb-3 p-2 bg-orange-100 rounded text-sm text-orange-800">
            {error}
          </div>
        )}
        
        <Button 
          onClick={onUnlock}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          size="lg"
        >
          <Volume2 className="h-5 w-5 mr-2" />
          {isMobile ? 'Habilitar Audio en Móvil' : 'Activar Reproductor de Voz'}
        </Button>
        
        <p className="text-xs text-orange-600 mt-2 text-center">
          Solo necesitas hacer esto una vez por sesión
        </p>
      </CardContent>
    </Card>
  );
};
