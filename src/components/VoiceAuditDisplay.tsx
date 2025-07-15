
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Mic, AlertTriangle, CheckCircle } from 'lucide-react';
import { performVoiceAudit, VoiceAuditSummary, VoiceAuditResult } from '@/utils/voiceAudit';

interface VoiceAuditDisplayProps {
  onAuditComplete?: (summary: VoiceAuditSummary) => void;
}

export const VoiceAuditDisplay: React.FC<VoiceAuditDisplayProps> = ({ onAuditComplete }) => {
  const [auditSummary, setAuditSummary] = useState<VoiceAuditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Starting voice audit...');
      const summary = await performVoiceAudit();
      setAuditSummary(summary);
      onAuditComplete?.(summary);
      console.log('✅ Voice audit completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during voice audit';
      setError(errorMessage);
      console.error('❌ Voice audit failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Run audit automatically on mount
    runAudit();
  }, []);

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Voice Audit Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={runAudit} variant="outline" size="sm">
            Retry Audit
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 animate-pulse" />
            Analyzing Available Voices...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enumerating and analyzing all browser voices for female Spanish TTS compatibility...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!auditSummary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Voice Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runAudit} variant="outline">
            Run Voice Audit
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Audit Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {auditSummary.femaleSpanishVoices > 0 ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            Voice Audit Results
          </CardTitle>
          <CardDescription>
            Completed at {formatTimestamp(auditSummary.auditTimestamp)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{auditSummary.totalVoices}</div>
              <div className="text-xs text-muted-foreground">Total Voices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{auditSummary.spanishVoices}</div>
              <div className="text-xs text-muted-foreground">Spanish Voices</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${auditSummary.femaleSpanishVoices > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {auditSummary.femaleSpanishVoices}
              </div>
              <div className="text-xs text-muted-foreground">Female Spanish</div>
            </div>
            <div className="text-center">
              <Badge variant={auditSummary.femaleSpanishVoices > 0 ? 'default' : 'destructive'}>
                {auditSummary.femaleSpanishVoices > 0 ? 'Compatible' : 'Incompatible'}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Platform:</strong> {auditSummary.platform}</p>
            <p><strong>Browser:</strong> {auditSummary.userAgent.split(' ').slice(-2).join(' ')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Female Spanish Voices */}
      {auditSummary.femaleSpanishVoices > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✅ Detected Female Spanish Voices</CardTitle>
            <CardDescription>
              {auditSummary.femaleSpanishVoices} voice(s) suitable for TTS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditSummary.detectedFemaleSpanishVoices.map((voice, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{voice.name}</h4>
                    <Badge variant={getConfidenceBadgeVariant(voice.confidence)}>
                      {voice.confidence} confidence
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Language:</strong> {voice.lang}</p>
                    <p><strong>Local Service:</strong> {voice.localService ? 'Yes' : 'No'}</p>
                    <p><strong>Default:</strong> {voice.default ? 'Yes' : 'No'}</p>
                    <p><strong>Reasoning:</strong> {voice.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Voices (Collapsible) */}
      <Collapsible open={showAllVoices} onOpenChange={setShowAllVoices}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0">
                <CardTitle className="flex items-center gap-2">
                  {showAllVoices ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  All Detected Voices ({auditSummary.totalVoices})
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {auditSummary.allVoices.map((voice, index) => (
                    <div key={index} className="border rounded p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{voice.name}</span>
                        <div className="flex gap-1">
                          {voice.isSpanish && <Badge variant="secondary" className="text-xs">ES</Badge>}
                          {voice.isFemaleSpanish && <Badge variant="default" className="text-xs">Female</Badge>}
                        </div>
                      </div>
                      <p><strong>Lang:</strong> {voice.lang}</p>
                      <p><strong>Local:</strong> {voice.localService ? 'Yes' : 'No'}</p>
                      {voice.isSpanish && (
                        <p className="text-muted-foreground">{voice.reasoning}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Rerun Audit */}
      <div className="flex justify-center">
        <Button onClick={runAudit} variant="outline" size="sm">
          Rerun Audit
        </Button>
      </div>
    </div>
  );
};
