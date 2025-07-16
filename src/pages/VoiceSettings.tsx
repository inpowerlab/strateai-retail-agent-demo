
import React, { useState } from 'react';
import { UniversalTTSControls } from '@/components/UniversalTTSControls';
import { TTSAuditDashboard } from '@/components/TTSAuditDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComprehensiveVoiceAudit } from '@/components/ComprehensiveVoiceAudit';

export const VoiceSettings: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState('es-US-Journey-F');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Configuración de Voz Premium</h1>
        <p className="text-muted-foreground">
          Configura las voces premium de Google Cloud y analiza el rendimiento del sistema TTS
        </p>
      </div>

      <Tabs defaultValue="controls" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="controls">Controles</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="space-y-6">
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
                    <li>🆕 Sistema de auditoría completo</li>
                    <li>🆕 Análisis de latencia y rendimiento</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <TTSAuditDashboard />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <ComprehensiveVoiceAudit />
          
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Configuración Actual:</h3>
                <ul className="text-sm space-y-1">
                  <li>🎯 <strong>Voz Primaria:</strong> Google Cloud Text-to-Speech</li>
                  <li>🔄 <strong>Fallback:</strong> Browser SpeechSynthesis (Español)</li>
                  <li>⚡ <strong>Latencia Objetivo:</strong> &lt; 2 segundos</li>
                  <li>🎤 <strong>Calidad:</strong> 24kHz MP3 (Google), Variable (Browser)</li>
                  <li>🔍 <strong>Auditoría:</strong> Activada con métricas completas</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Navegadores Compatibles:</h3>
                <ul className="text-sm space-y-1">
                  <li>✅ <strong>Chrome:</strong> Soporte completo + Voces premium</li>
                  <li>✅ <strong>Edge:</strong> Soporte completo + Voces premium</li>
                  <li>✅ <strong>Firefox:</strong> Soporte básico + Fallback</li>
                  <li>✅ <strong>Safari:</strong> Soporte básico + Fallback</li>
                  <li>📱 <strong>Móvil:</strong> Soporte con limitaciones</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
