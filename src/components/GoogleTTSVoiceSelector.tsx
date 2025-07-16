
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GOOGLE_SPANISH_VOICES } from '@/hooks/useGoogleTTS';

interface GoogleTTSVoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  className?: string;
}

export const GoogleTTSVoiceSelector: React.FC<GoogleTTSVoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
  className = ""
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="google-voice-select" className="text-sm font-medium">
        Voz Premium de Google Cloud
      </Label>
      <Select value={selectedVoice} onValueChange={onVoiceChange}>
        <SelectTrigger id="google-voice-select" className="w-full">
          <SelectValue placeholder="Selecciona una voz premium" />
        </SelectTrigger>
        <SelectContent>
          {GOOGLE_SPANISH_VOICES.map((voice) => (
            <SelectItem key={voice.name} value={voice.name}>
              <div className="flex items-center justify-between w-full">
                <span>{voice.label}</span>
                <span className={`text-xs px-2 py-1 rounded ml-2 ${
                  voice.tier === 'premium' 
                    ? 'bg-purple-100 text-purple-700' 
                    : voice.tier === 'studio'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {voice.tier === 'premium' ? '⭐ Premium' : 
                   voice.tier === 'studio' ? '🎙️ Studio' : '📢 Standard'}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Las voces premium ofrecen la mayor calidad y naturalidad en español
      </p>
    </div>
  );
};
