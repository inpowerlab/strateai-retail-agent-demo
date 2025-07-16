
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, Mic, Volume2 } from 'lucide-react';
import { useEnhancedGoogleTTS } from '@/hooks/useEnhancedGoogleTTS';

export const TTSAuditDashboard: React.FC = () => {
  const [testText] = useState("Hola, esta es una prueba completa del sistema de síntesis de voz premium con Google Cloud Text-to-Speech.");
  const [currentAudit, setCurrentAudit] = useState<any>(null);
  
  const {
    speak,
    stop,
    isPlaying,
    isInitializing,
    error,
    currentMethod,
    currentVoice,
    auditReports,
    getLatestAuditReport,
    clearAuditReports,
    auditBrowserVoices,
    isAuditing
  } = useEnhancedGoogleTTS({ 
    voice: 'es-US-Journey-F',
    auditMode: true,
    enableFallback: true 
  });

  const runAudit = async () => {
    console.log('🔍 Starting comprehensive TTS audit...');
    const result = await speak(testText);
    const auditReport = getLatestAuditReport();
    setCurrentAudit(auditReport);
  };

  const getLatencyStatus = (latency?: number) => {
    if (!latency) return { status: 'unknown', color: 'gray' };
    if (latency < 1000) return { status: 'excellent', color: 'green' };
    if (latency < 2000) return { status: 'good', color: 'yellow' };
    return { status: 'poor', color: 'red' };
  };

  const getMethodStatus = (method: string, fallbackReason?: string) => {
    if (method === 'google') return { status: 'optimal', color: 'green' };
    if (method === 'browser' && fallbackReason) return { status: 'fallback', color: 'orange' };
    if (method === 'browser' && !fallbackReason) return { status: 'error', color: 'red' };
    return { status: 'failed', color: 'red' };
  };

  const browserVoiceAudit = auditBrowserVoices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">TTS System Audit Dashboard</h2>
        <div className="flex gap-2">
          <Button onClick={runAudit} disabled={isPlaying || isInitializing || isAuditing}>
            {isAuditing ? 'Auditing...' : 'Run Full Audit'}
          </Button>
          <Button variant="outline" onClick={clearAuditReports}>
            Clear Reports
          </Button>
        </div>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Current System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Method</div>
              <Badge variant={currentMethod === 'google' ? 'default' : 'secondary'}>
                {currentMethod === 'google' ? '🌩️ Google Cloud' : 
                 currentMethod === 'browser' ? '🌐 Browser' : '❌ None'}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Voice</div>
              <div className="text-sm font-medium">{currentVoice || 'None'}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="flex items-center justify-center gap-1">
                {isPlaying ? (
                  <><Volume2 className="h-4 w-4 text-green-600" /> Playing</>
                ) : isInitializing ? (
                  <><Clock className="h-4 w-4 text-yellow-600" /> Loading</>
                ) : (
                  <><CheckCircle className="h-4 w-4 text-gray-400" /> Ready</>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Error</div>
              <div className="text-sm text-red-600">{error || 'None'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="voice-selection">Voice Selection</TabsTrigger>
          <TabsTrigger value="fallback">Fallback Logic</TabsTrigger>
          <TabsTrigger value="browser-voices">Browser Voices</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {currentAudit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {currentAudit.metrics.totalLatency || 0}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Total Latency</div>
                      <Badge variant={getLatencyStatus(currentAudit.metrics.totalLatency).status === 'excellent' ? 'default' : 'destructive'}>
                        {getLatencyStatus(currentAudit.metrics.totalLatency).status}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {currentAudit.metrics.edgeFunctionLatency || 0}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Edge Function</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {currentAudit.metrics.audioProcessingTime || 0}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Audio Processing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {currentAudit.metrics.playbackLatency || 0}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Playback</div>
                    </div>
                  </div>
                  
                  {currentAudit.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {currentAudit.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-sm text-amber-800 bg-amber-50 p-2 rounded">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Run an audit to see performance metrics
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice-selection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice Selection Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {currentAudit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Requested Voice</h4>
                      <div className="text-sm bg-blue-50 p-2 rounded">
                        {currentAudit.voiceSelection.requestedVoice}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Actual Voice Used</h4>
                      <div className="text-sm bg-green-50 p-2 rounded">
                        {currentAudit.voiceSelection.actualVoice}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Method Status</h4>
                    <Badge variant={getMethodStatus(currentAudit.metrics.method, currentAudit.metrics.fallbackReason).status === 'optimal' ? 'default' : 'destructive'}>
                      {currentAudit.metrics.method === 'google' ? '✅ Google Cloud (Optimal)' :
                       currentAudit.metrics.method === 'browser' ? '⚠️ Browser Fallback' : '❌ Failed'}
                    </Badge>
                  </div>

                  {currentAudit.metrics.fallbackReason && (
                    <div>
                      <h4 className="font-semibold mb-2 text-amber-600">Fallback Reason</h4>
                      <div className="text-sm bg-amber-50 p-2 rounded border-l-4 border-amber-400">
                        {currentAudit.metrics.fallbackReason}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Run an audit to see voice selection details
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fallback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fallback Logic Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Fallback Triggers</h4>
                  <div className="space-y-2">
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      ✅ Google Cloud API Error → Browser Fallback
                    </div>
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      ✅ Network Timeout → Browser Fallback
                    </div>
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      ✅ Audio Playback Error → Browser Fallback
                    </div>
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      ✅ Quota Exceeded → Browser Fallback
                    </div>
                  </div>
                </div>

                {auditReports.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Recent Fallback Events</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {auditReports.slice(-5).map((report, index) => (
                        <div key={index} className="text-sm bg-white border p-2 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant={report.success ? 'default' : 'destructive'}>
                                {report.metrics.method}
                              </Badge>
                              {report.metrics.fallbackReason && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Reason: {report.metrics.fallbackReason}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(report.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="browser-voices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Browser Voice Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {browserVoiceAudit.totalVoices}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Voices</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {browserVoiceAudit.spanishVoices.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Spanish Voices</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-600">
                      {browserVoiceAudit.femaleSpanishVoices.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Female Spanish</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Available Spanish Voices</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {browserVoiceAudit.spanishVoices.map((voice, index) => (
                        <div key={index} className="text-sm bg-gray-50 p-1 rounded">
                          {voice}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Female Spanish Voices</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {browserVoiceAudit.femaleSpanishVoices.length > 0 ? (
                        browserVoiceAudit.femaleSpanishVoices.map((voice, index) => (
                          <div key={index} className="text-sm bg-pink-50 p-1 rounded">
                            {voice}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          No female-specific Spanish voices detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
