
import { VoiceAuditResult, VoiceAuditSummary, performVoiceAudit } from './voiceAudit';

export interface VoiceSelectionResult {
  voice: SpeechSynthesisVoice | null;
  tier: 1 | 2 | 3 | 4;
  reasoning: string;
  fallbackUsed: boolean;
  quality: 'premium' | 'standard' | 'fallback';
  name: string;
  lang: string;
}

export interface VoiceSelectionOptions {
  preferredLanguage?: string;
  requireSpanish?: boolean;
  requireFemale?: boolean;
  allowFallback?: boolean;
}

class UniversalVoiceSelector {
  private auditCache: VoiceAuditSummary | null = null;
  private lastAuditTime: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private async getVoiceAudit(): Promise<VoiceAuditSummary> {
    const now = Date.now();
    
    // Use cached audit if recent
    if (this.auditCache && (now - this.lastAuditTime) < this.CACHE_DURATION) {
      return this.auditCache;
    }

    // Perform fresh audit
    try {
      this.auditCache = await performVoiceAudit();
      this.lastAuditTime = now;
      return this.auditCache;
    } catch (error) {
      console.error('❌ Voice audit failed:', error);
      // Return minimal audit with current voices
      const voices = window.speechSynthesis.getVoices();
      return {
        totalVoices: voices.length,
        spanishVoices: 0,
        femaleSpanishVoices: 0,
        detectedFemaleSpanishVoices: [],
        allSpanishVoices: [],
        systemDefaultVoices: [],
        allVoices: [],
        recommendedVoice: null,
        fallbackChain: [],
        auditTimestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };
    }
  }

  async selectBestVoice(options: VoiceSelectionOptions = {}): Promise<VoiceSelectionResult> {
    const {
      preferredLanguage = 'es-ES',
      requireSpanish = false,
      requireFemale = false,
      allowFallback = true
    } = options;

    console.log('🎯 UNIVERSAL VOICE SELECTION: Starting voice selection process...');
    console.log('Options:', { preferredLanguage, requireSpanish, requireFemale, allowFallback });

    const audit = await this.getVoiceAudit();
    
    if (audit.fallbackChain.length === 0) {
      console.error('❌ No voices available for TTS selection');
      return {
        voice: null,
        tier: 4,
        reasoning: 'No voices available on this system',
        fallbackUsed: false,
        quality: 'fallback',
        name: 'None',
        lang: 'none'
      };
    }

    // Try to select voice based on requirements and fallback rules
    const selectionResult = this.selectFromFallbackChain(
      audit.fallbackChain,
      { requireSpanish, requireFemale, allowFallback }
    );

    console.log('🎤 VOICE SELECTED:', {
      name: selectionResult.name,
      tier: selectionResult.tier,
      reasoning: selectionResult.reasoning,
      fallbackUsed: selectionResult.fallbackUsed,
      quality: selectionResult.quality
    });

    return selectionResult;
  }

  private selectFromFallbackChain(
    fallbackChain: VoiceAuditResult[],
    options: { requireSpanish: boolean; requireFemale: boolean; allowFallback: boolean }
  ): VoiceSelectionResult {
    const { requireSpanish, requireFemale, allowFallback } = options;

    // Stage 1: Try to meet all requirements (Tier 1 - Female Spanish)
    if (requireFemale && requireSpanish) {
      const femaleSpanishVoices = fallbackChain.filter(v => v.tier === 1 && v.isFemaleSpanish);
      if (femaleSpanishVoices.length > 0) {
        const selected = femaleSpanishVoices[0];
        return {
          voice: selected.voice,
          tier: selected.tier,
          reasoning: `Perfect match: ${selected.reasoning}`,
          fallbackUsed: false,
          quality: selected.quality,
          name: selected.name,
          lang: selected.lang
        };
      }
    }

    // Stage 2: Spanish voice requirement (Tier 1 or 2)
    if (requireSpanish || !allowFallback) {
      const spanishVoices = fallbackChain.filter(v => v.isSpanish && (v.tier === 1 || v.tier === 2));
      if (spanishVoices.length > 0) {
        const selected = spanishVoices[0];
        return {
          voice: selected.voice,
          tier: selected.tier,
          reasoning: `Spanish fallback: ${selected.reasoning}`,
          fallbackUsed: requireFemale, // It's a fallback if we required female but got male/neutral
          quality: selected.quality,
          name: selected.name,
          lang: selected.lang
        };
      }
    }

    // Stage 3: System default voice with potential Spanish support (Tier 3)
    if (allowFallback) {
      const defaultVoices = fallbackChain.filter(v => v.tier === 3);
      if (defaultVoices.length > 0) {
        const selected = defaultVoices[0];
        return {
          voice: selected.voice,
          tier: selected.tier,
          reasoning: `System default fallback: ${selected.reasoning}`,
          fallbackUsed: true,
          quality: selected.quality,
          name: selected.name,
          lang: selected.lang
        };
      }
    }

    // Stage 4: Any available voice as last resort (Tier 4)
    if (allowFallback && fallbackChain.length > 0) {
      const selected = fallbackChain[0]; // Take the first available voice
      return {
        voice: selected.voice,
        tier: selected.tier,
        reasoning: `Last resort fallback: ${selected.reasoning}`,
        fallbackUsed: true,
        quality: 'fallback',
        name: selected.name,
        lang: selected.lang
      };
    }

    // No voice could be selected
    return {
      voice: null,
      tier: 4,
      reasoning: 'No suitable voice found matching requirements',
      fallbackUsed: false,
      quality: 'fallback',
      name: 'None',
      lang: 'none'
    };
  }

  // Test a voice to ensure it actually works
  async testVoice(voice: SpeechSynthesisVoice): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const testUtterance = new SpeechSynthesisUtterance('Test');
        testUtterance.voice = voice;
        testUtterance.volume = 0.01; // Very quiet test
        testUtterance.rate = 2.0; // Fast test
        
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }, 1000);

        testUtterance.onstart = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            window.speechSynthesis.cancel(); // Stop the test
            resolve(true);
          }
        };

        testUtterance.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
        };

        window.speechSynthesis.speak(testUtterance);
      } catch (error) {
        console.warn('Voice test failed:', error);
        resolve(false);
      }
    });
  }

  // Clear cache to force fresh audit
  clearCache(): void {
    this.auditCache = null;
    this.lastAuditTime = 0;
  }
}

// Export singleton instance
export const universalVoiceSelector = new UniversalVoiceSelector();

// Convenience functions
export const selectBestVoice = (options?: VoiceSelectionOptions) => 
  universalVoiceSelector.selectBestVoice(options);

export const testVoicePlayback = (voice: SpeechSynthesisVoice) => 
  universalVoiceSelector.testVoice(voice);

export const clearVoiceCache = () => 
  universalVoiceSelector.clearCache();
