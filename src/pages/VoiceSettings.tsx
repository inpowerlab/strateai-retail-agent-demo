
import React, { useState } from 'react';
import { UniversalTTSControls } from '@/components/UniversalTTSControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComprehensiveVoiceAudit } from '@/components/ComprehensiveVoiceAudit';

export const VoiceSettings: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState('es-US-Journey-F');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Configuración de Voz Premium</h1>
        <p className="text-muted-foreground">
          Configura las voces premium de Google Cloud y prueba la calidad de audio
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <UniversalTTSControls
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Proveedores de Voz Disponibles:</h3>
              <ul className="text-sm space-y-1">
                <li>🌩️ <strong>Google Cloud TTS</strong> - Voces premium Chirp3-HD</li>
                <li>🤖 <strong>OpenAI TTS</strong> - Voz NOVA de alta calidad</li>
                <li>🌐 <strong>Browser TTS</strong> - Fallback del navegador</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Características Premium:</h3>
              <ul className="text-sm space-y-1">
                <li>✅ Fallback automático inteligente</li>
                <li>✅ Voces femeninas en español prioritarias</li>
                <li>✅ Audio de alta calidad (24kHz)</li>
                <li>✅ Procesamiento de texto optimizado</li>
                <li>✅ Control de velocidad y tono</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <ComprehensiveVoiceAudit />
    </div>
  );
};
