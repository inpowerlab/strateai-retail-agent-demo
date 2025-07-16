
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Mic, 
  Volume2, 
  Monitor, 
  Smartphone,
  Download,
  Play,
  Pause
} from 'lucide-react';
import { 
  performComprehensiveVoiceAudit, 
  generateAuditReport, 
  detectVoiceGender,
  testVoicePlayback
} from '@/utils/voiceTesting';

interface ComprehensiveVoiceAuditProps {
  onAuditComplete?: (hasWorkingSpanishVoice: boolean) => void;
}

export const ComprehensiveVoiceAudit: React.FC<ComprehensiveVoiceAuditProps> = ({ 
  onAuditComplete 
}) => {
  const [audit, setAudit] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testingVoice, setTestingVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);

  const runComprehensiveAudit = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentTest('Initializing audit...');
    
    try {
      // Run the comprehensive audit with progress updates
      const auditResult = await performComprehensiveVoiceAudit();
      setAudit(auditResult);
      
      // Report completion
      const hasWorkingVoice = auditResult.recommendedVoice !== null;
      onAuditComplete?.(hasWorkingVoice);
      
      // Generate and log full report
      const report = generateAuditReport(auditResult);
      console.log('\n' + report);
      
    } catch (error) {
      console.error('❌ Comprehensive audit failed:', error);
    } finally {
      setIsRunning(false);
      setProgress(100);
      setCurrentTest('Audit complete');
    }
  };

  const testIndividualVoice = async (voice: SpeechSynthesisVoice) => {
    setTestingVoice(voice);
    try {
      const result = await testVoicePlayback(voice, "Esta es una prueba de voz en español");
      console.log(`Voice test result for ${voice.name}:`, result);
    } catch (error) {
      console.error(`Voice test failed for ${voice.name}:`, error);
    } finally {
      setTestingVoice(null);
    }
  };

  useEffect(() => {
    // Run audit automatically on mount
    runComprehensiveAudit();
  }, []);

  const getStatusIcon = (success: boolean) => {
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getGenderBadge = (voice: SpeechSynthesisVoice) => {
    const gender = detectVoiceGender(voice);
    const variant = gender === 'female' ? 'default' : gender === 'male' ? 'secondary' : 'outline';
    return <Badge variant={variant} className="text-xs">{gender}</Badge>;
  };

  const downloadReport = () => {
    if (!audit) return;
    
    const report = generateAuditReport(audit);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tts-voice-audit-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isRunning) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 animate-pulse" />
            Running Comprehensive TTS Audit
          </CardTitle>
          <CardDescription>
            Testing all available voices for Spanish compatibility...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="w-full" />
          <div className="text-sm text-muted-foreground">{currentTest}</div>
        </CardContent>
      </Card>
    );
  }

  if (!audit) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>TTS Voice Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runComprehensiveAudit} className="w-full">
            Run Comprehensive Voice Audit
          </Button>
        </CardContent>
      </Card>
    );
  }

  const successfulVoices = audit.testResults?.filter((r: any) => r.success) || [];
  const failedVoices = audit.testResults?.filter((r: any) => !r.success) || [];

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Audit Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {audit.recommendedVoice ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            TTS Audit Results
            <Badge variant={audit.recommendedVoice ? 'default' : 'destructive'}>
              {audit.recommendedVoice ? 'Compatible' : 'Issues Found'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Completed at {new Date(audit.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{audit.totalVoices}</div>
              <div className="text-xs text-muted-foreground">Total Voices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{audit.spanishVoices?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Spanish Voices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{successfulVoices.length}</div>
              <div className="text-xs text-muted-foreground">Working</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedVoices.length}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* System Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {/Mobile|Android|iPhone|iPad/.test(audit.userAgent) ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            <span>{audit.platform}</span>
            <span>•</span>
            <span>{audit.userAgent.split(' ').slice(-2).join(' ')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Voice */}
      {audit.recommendedVoice && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Recommended Voice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{audit.recommendedVoice.name}</h4>
                <p className="text-sm text-muted-foreground">{audit.recommendedVoice.lang}</p>
              </div>
              <div className="flex gap-2">
                {getGenderBadge(audit.recommendedVoice)}
                {audit.recommendedVoice.localService && (
                  <Badge variant="secondary" className="text-xs">Local</Badge>
                )}
                {audit.recommendedVoice.default && (
                  <Badge variant="outline" className="text-xs">Default</Badge>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => testIndividualVoice(audit.recommendedVoice)}
                  disabled={testingVoice === audit.recommendedVoice}
                >
                  {testingVoice === audit.recommendedVoice ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Test Results */}
      {audit.testResults && audit.testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Voice Test Results</CardTitle>
            <CardDescription>
              Detailed test results for all Spanish voices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              <div className="space-y-3">
                {audit.testResults.map((result: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.success)}
                        <span className="font-medium">{result.voice.name}</span>
                        <span className="text-sm text-muted-foreground">({result.voice.lang})</span>
                      </div>
                      <div className="flex gap-2">
                        {getGenderBadge(result.voice)}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => testIndividualVoice(result.voice)}
                          disabled={testingVoice === result.voice}
                        >
                          {testingVoice === result.voice ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {result.success ? (
                      <div className="text-sm text-green-600">
                        ✅ Test successful ({result.latency}ms latency)
                      </div>
                    ) : (
                      <div className="text-sm text-red-600">
                        ❌ {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Failure Reasons & Troubleshooting */}
      {audit.failureReasons && audit.failureReasons.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <strong>Issues detected:</strong>
              <ul className="list-disc list-inside space-y-1">
                {audit.failureReasons.map((reason: string, index: number) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
              <div className="pt-2">
                <strong>Troubleshooting steps:</strong>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Install Spanish language pack in your operating system</li>
                  <li>Enable text-to-speech in system accessibility settings</li>
                  <li>Click any audio button to enable browser audio playback</li>
                  <li>Check browser permissions for audio access</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={runComprehensiveAudit} variant="outline">
          Re-run Audit
        </Button>
        <Button onClick={downloadReport} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download Report
        </Button>
        <Button 
          onClick={() => setShowFullReport(!showFullReport)} 
          variant="outline"
        >
          {showFullReport ? 'Hide' : 'Show'} Full Report
        </Button>
      </div>

      {/* Full Report */}
      {showFullReport && audit && (
        <Card>
          <CardHeader>
            <CardTitle>Full Audit Report</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {generateAuditReport(audit)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
