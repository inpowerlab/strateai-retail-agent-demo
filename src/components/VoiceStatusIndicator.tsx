
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { VoiceSelectionResult } from '@/utils/voiceSelection';

interface VoiceStatusIndicatorProps {
  voiceInfo: VoiceSelectionResult | null;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  voiceInfo,
  className = "",
  showDetails = false,
  compact = false
}) => {
  if (!voiceInfo) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Voz no seleccionada</span>
      </div>
    );
  }

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 1: return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 2: return <Info className="h-4 w-4 text-blue-600" />;
      case 3: return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 4: return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'default';
      case 2: return 'secondary';
      case 3: return 'outline';
      case 4: return 'destructive';
      default: return 'outline';
    }
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1: return 'Óptima';
      case 2: return 'Buena';
      case 3: return 'Sistema';
      case 4: return 'Básica';
      default: return 'Desconocida';
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'premium': return <Badge variant="default" className="text-xs">Premium</Badge>;
      case 'standard': return <Badge variant="secondary" className="text-xs">Estándar</Badge>;
      case 'fallback': return <Badge variant="outline" className="text-xs">Fallback</Badge>;
      default: return null;
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              {getTierIcon(voiceInfo.tier)}
              <span className="text-sm font-medium">{voiceInfo.name}</span>
              {voiceInfo.fallbackUsed && (
                <Badge variant="outline" className="text-xs">Fallback</Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1 text-sm">
              <p><strong>Voz:</strong> {voiceInfo.name}</p>
              <p><strong>Idioma:</strong> {voiceInfo.lang}</p>
              <p><strong>Calidad:</strong> {getTierLabel(voiceInfo.tier)}</p>
              <p><strong>Razón:</strong> {voiceInfo.reasoning}</p>
              {voiceInfo.fallbackUsed && (
                <p className="text-amber-600"><strong>⚠️ Usando fallback</strong></p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (showDetails) {
    return (
      <Card className={className}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTierIcon(voiceInfo.tier)}
              <span className="font-semibold">Estado de Voz TTS</span>
            </div>
            <Badge variant={getTierColor(voiceInfo.tier)}>
              Tier {voiceInfo.tier} - {getTierLabel(voiceInfo.tier)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Voz:</span>
              <p className="mt-1">{voiceInfo.name}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Idioma:</span>
              <p className="mt-1">{voiceInfo.lang}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground text-sm">Calidad:</span>
            {getQualityBadge(voiceInfo.quality)}
            {voiceInfo.fallbackUsed && (
              <Badge variant="outline" className="text-xs text-amber-600">
                Fallback Usado
              </Badge>
            )}
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Selección:</strong> {voiceInfo.reasoning}
            </p>
          </div>

          {voiceInfo.fallbackUsed && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Fallback Activado</p>
                <p className="text-amber-700 mt-1">
                  La voz ideal no estaba disponible. Se seleccionó automáticamente la mejor alternativa.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {getTierIcon(voiceInfo.tier)}
      <div className="flex flex-col">
        <span className="text-sm font-medium">{voiceInfo.name}</span>
        <span className="text-xs text-muted-foreground">{voiceInfo.lang}</span>
      </div>
      <div className="flex gap-1">
        <Badge variant={getTierColor(voiceInfo.tier)} className="text-xs">
          {getTierLabel(voiceInfo.tier)}
        </Badge>
        {getQualityBadge(voiceInfo.quality)}
        {voiceInfo.fallbackUsed && (
          <Badge variant="outline" className="text-xs text-amber-600">
            Fallback
          </Badge>
        )}
      </div>
    </div>
  );
};
