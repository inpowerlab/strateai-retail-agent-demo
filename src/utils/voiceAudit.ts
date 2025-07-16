
export interface VoiceAuditResult {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  isSpanish: boolean;
  isFemaleSpanish: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  tier: 1 | 2 | 3 | 4; // Voice selection tier
  quality: 'premium' | 'standard' | 'fallback';
}

export interface VoiceAuditSummary {
  totalVoices: number;
  spanishVoices: number;
  femaleSpanishVoices: number;
  detectedFemaleSpanishVoices: VoiceAuditResult[];
  allSpanishVoices: VoiceAuditResult[];
  systemDefaultVoices: VoiceAuditResult[];
  allVoices: VoiceAuditResult[];
  recommendedVoice: VoiceAuditResult | null;
  fallbackChain: VoiceAuditResult[];
  auditTimestamp: string;
  userAgent: string;
  platform: string;
}

// Enhanced female Spanish voice indicators with regional variants
const FEMALE_SPANISH_INDICATORS = {
  high: [
    // Spain (Castilian)
    'mónica', 'monica', 'elena', 'conchita', 'pilar', 'esperanza', 'paloma',
    'marisol', 'remedios', 'sabina', 'ximena', 'carmen',
    // Mexico
    'paulina', 'angelica', 'esperanza', 'guadalupe', 'maria', 'rosa',
    // Argentina
    'silvana', 'valeria', 'carolina', 'patricia',
    // Colombia
    'andrea', 'sofia', 'isabella',
    // General Spanish female names
    'lucia', 'ana', 'laura', 'isabel', 'cristina', 'beatriz'
  ],
  medium: [
    'spanish female', 'español mujer', 'spanish woman', 'es-es female',
    'es-mx female', 'es-ar female', 'es-co female', 'es-ve female',
    'female', 'mujer', 'femenina', 'woman', 'girl', 'chica'
  ],
  low: [
    'spain', 'mexico', 'argentina', 'colombia', 'venezuela', 'chile',
    'spanish', 'español', 'latina', 'hispanic', 'iberian'
  ]
};

const SPANISH_LOCALES = [
  'es-es', 'es-mx', 'es-ar', 'es-co', 'es-pe', 'es-ve', 'es-cl', 'es-ec',
  'es-gt', 'es-cu', 'es-bo', 'es-do', 'es-hn', 'es-py', 'es-sv', 'es-ni',
  'es-cr', 'es-pa', 'es-uy', 'es-pr', 'es'
];

export const analyzeVoiceGender = (voice: SpeechSynthesisVoice): {
  isFemaleSpanish: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  tier: 1 | 2 | 3 | 4;
  quality: 'premium' | 'standard' | 'fallback';
} => {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  
  // Check if it's Spanish
  const isSpanish = SPANISH_LOCALES.some(locale => lang.startsWith(locale));
  
  if (!isSpanish) {
    // Tier 4: Non-Spanish system voice (last resort)
    return {
      isFemaleSpanish: false,
      confidence: 'low',
      reasoning: `Not Spanish language (${voice.lang}) - Tier 4 fallback`,
      tier: 4,
      quality: 'fallback'
    };
  }

  // High confidence female indicators - Tier 1
  for (const indicator of FEMALE_SPANISH_INDICATORS.high) {
    if (name.includes(indicator)) {
      return {
        isFemaleSpanish: true,
        confidence: 'high',
        reasoning: `Tier 1: High confidence female Spanish voice - "${indicator}" in "${voice.name}"`,
        tier: 1,
        quality: voice.localService ? 'premium' : 'standard'
      };
    }
  }

  // Medium confidence female indicators - Tier 1
  for (const indicator of FEMALE_SPANISH_INDICATORS.medium) {
    if (name.includes(indicator)) {
      return {
        isFemaleSpanish: true,
        confidence: 'medium',
        reasoning: `Tier 1: Medium confidence female Spanish voice - "${indicator}" in "${voice.name}"`,
        tier: 1,
        quality: 'standard'
      };
    }
  }

  // Any Spanish voice (not clearly female) - Tier 2
  return {
    isFemaleSpanish: false,
    confidence: 'medium',
    reasoning: `Tier 2: Spanish voice without clear gender indicators - "${voice.name}" (${voice.lang})`,
    tier: 2,
    quality: voice.localService ? 'standard' : 'fallback'
  };
};

export const buildFallbackChain = (voices: SpeechSynthesisVoice[]): VoiceAuditResult[] => {
  const auditResults: VoiceAuditResult[] = voices.map(voice => {
    const isSpanish = SPANISH_LOCALES.some(locale => voice.lang.toLowerCase().startsWith(locale));
    const genderAnalysis = analyzeVoiceGender(voice);
    
    return {
      voice,
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default,
      isSpanish,
      isFemaleSpanish: genderAnalysis.isFemaleSpanish,
      confidence: genderAnalysis.confidence,
      reasoning: genderAnalysis.reasoning,
      tier: genderAnalysis.tier,
      quality: genderAnalysis.quality
    };
  });

  // Build fallback chain in tier order
  const fallbackChain: VoiceAuditResult[] = [];
  
  // Tier 1: Female Spanish voices (high to medium confidence)
  const tier1Voices = auditResults
    .filter(r => r.tier === 1 && r.isFemaleSpanish)
    .sort((a, b) => {
      // Premium local voices first, then by confidence
      if (a.quality === 'premium' && b.quality !== 'premium') return -1;
      if (b.quality === 'premium' && a.quality !== 'premium') return 1;
      if (a.confidence === 'high' && b.confidence !== 'high') return -1;
      if (b.confidence === 'high' && a.confidence !== 'high') return 1;
      return 0;
    });

  // Tier 2: Any Spanish voices (male, neutral, or unclear gender)
  const tier2Voices = auditResults
    .filter(r => r.tier === 2 && r.isSpanish)
    .sort((a, b) => {
      // Local service voices first
      if (a.localService && !b.localService) return -1;
      if (b.localService && !a.localService) return 1;
      return 0;
    });

  // Tier 3: System default voices (may have Spanish locale capability)
  const tier3Voices = auditResults
    .filter(r => r.default || r.voice.default)
    .sort((a, b) => {
      // Prefer local service defaults
      if (a.localService && !b.localService) return -1;
      if (b.localService && !a.localService) return 1;
      return 0;
    });

  // Tier 4: Any remaining voices as absolute fallback
  const tier4Voices = auditResults
    .filter(r => !tier1Voices.includes(r) && !tier2Voices.includes(r) && !tier3Voices.includes(r))
    .sort((a, b) => {
      // Prefer local service voices
      if (a.localService && !b.localService) return -1;
      if (b.localService && !a.localService) return 1;
      return 0;
    });

  // Combine all tiers
  fallbackChain.push(...tier1Voices, ...tier2Voices, ...tier3Voices, ...tier4Voices);

  console.log('🔄 Built fallback chain:', {
    tier1: tier1Voices.length,
    tier2: tier2Voices.length,
    tier3: tier3Voices.length,
    tier4: tier4Voices.length,
    total: fallbackChain.length
  });

  return fallbackChain;
};

export const performVoiceAudit = (): Promise<VoiceAuditSummary> => {
  return new Promise((resolve) => {
    const auditVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('🔍 ENHANCED VOICE AUDIT: Starting comprehensive voice analysis...');
      console.log(`📊 Total voices detected: ${voices.length}`);
      
      const fallbackChain = buildFallbackChain(voices);
      const spanishVoices = fallbackChain.filter(r => r.isSpanish);
      const femaleSpanishVoices = fallbackChain.filter(r => r.isFemaleSpanish);
      const systemDefaultVoices = fallbackChain.filter(r => r.default);

      const summary: VoiceAuditSummary = {
        totalVoices: voices.length,
        spanishVoices: spanishVoices.length,
        femaleSpanishVoices: femaleSpanishVoices.length,
        detectedFemaleSpanishVoices: femaleSpanishVoices,
        allSpanishVoices: spanishVoices,
        systemDefaultVoices: systemDefaultVoices,
        allVoices: fallbackChain,
        recommendedVoice: fallbackChain.length > 0 ? fallbackChain[0] : null,
        fallbackChain,
        auditTimestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };

      // Enhanced console logging with fallback chain details
      console.group('🎤 ENHANCED VOICE AUDIT RESULTS');
      console.log('📅 Timestamp:', summary.auditTimestamp);
      console.log('🖥️ Platform:', summary.platform);
      console.log('🌐 User Agent:', summary.userAgent);
      console.log('📊 Total voices:', summary.totalVoices);
      console.log('🇪🇸 Spanish voices:', summary.spanishVoices);
      console.log('👩 Female Spanish voices:', summary.femaleSpanishVoices);
      console.log('🎯 Recommended voice:', summary.recommendedVoice?.name || 'None available');

      console.group('🔄 FALLBACK CHAIN ANALYSIS');
      summary.fallbackChain.forEach((result, index) => {
        const tierLabel = ['🥇 Tier 1', '🥈 Tier 2', '🥉 Tier 3', '🏁 Tier 4'][result.tier - 1];
        console.log(`${index + 1}. ${tierLabel}: ${result.name} (${result.lang})`);
        console.log(`   Quality: ${result.quality}, Confidence: ${result.confidence}`);
        console.log(`   Local: ${result.localService}, Default: ${result.default}`);
        console.log(`   Reasoning: ${result.reasoning}`);
      });
      console.groupEnd();

      if (summary.recommendedVoice) {
        console.log(`✅ RECOMMENDED VOICE: ${summary.recommendedVoice.name} (${summary.recommendedVoice.reasoning})`);
      } else {
        console.warn('⚠️ NO VOICES AVAILABLE - TTS WILL NOT WORK');
      }

      console.groupEnd();

      resolve(summary);
    };

    // Check if voices are already loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      auditVoices();
    } else {
      // Wait for voices to load
      const handleVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        auditVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      // Fallback timeout
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        auditVoices();
      }, 3000);
    }
  });
};
