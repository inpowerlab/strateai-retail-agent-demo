
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
}

export interface VoiceAuditSummary {
  totalVoices: number;
  spanishVoices: number;
  femaleSpanishVoices: number;
  detectedFemaleSpanishVoices: VoiceAuditResult[];
  allVoices: VoiceAuditResult[];
  auditTimestamp: string;
  userAgent: string;
  platform: string;
}

// Female Spanish voice indicators (names and patterns)
const FEMALE_SPANISH_INDICATORS = {
  high: [
    'mónica', 'monica', 'elena', 'conchita', 'paulina', 'carmen', 'pilar',
    'esperanza', 'paloma', 'marisol', 'remedios', 'sabina', 'ximena'
  ],
  medium: [
    'spanish female', 'español mujer', 'spanish woman', 'es-es female',
    'es-mx female', 'es-ar female', 'female', 'mujer', 'femenina'
  ],
  low: [
    'spain', 'mexico', 'argentina', 'spanish', 'español', 'latina'
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
} => {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  
  // Check if it's Spanish
  const isSpanish = SPANISH_LOCALES.some(locale => lang.startsWith(locale));
  if (!isSpanish) {
    return {
      isFemaleSpanish: false,
      confidence: 'low',
      reasoning: `Not Spanish language (${voice.lang})`
    };
  }

  // High confidence female indicators
  for (const indicator of FEMALE_SPANISH_INDICATORS.high) {
    if (name.includes(indicator)) {
      return {
        isFemaleSpanish: true,
        confidence: 'high',
        reasoning: `High confidence female name indicator: "${indicator}" in "${voice.name}"`
      };
    }
  }

  // Medium confidence female indicators
  for (const indicator of FEMALE_SPANISH_INDICATORS.medium) {
    if (name.includes(indicator)) {
      return {
        isFemaleSpanish: true,
        confidence: 'medium',
        reasoning: `Medium confidence female indicator: "${indicator}" in "${voice.name}"`
      };
    }
  }

  // Low confidence - Spanish but no clear female indicators
  for (const indicator of FEMALE_SPANISH_INDICATORS.low) {
    if (name.includes(indicator)) {
      return {
        isFemaleSpanish: false,
        confidence: 'low',
        reasoning: `Spanish voice but no clear female indicators: "${voice.name}"`
      };
    }
  }

  return {
    isFemaleSpanish: false,
    confidence: 'low',
    reasoning: `Spanish voice with unclear gender: "${voice.name}"`
  };
};

export const performVoiceAudit = (): Promise<VoiceAuditSummary> => {
  return new Promise((resolve) => {
    const auditVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('🔍 VOICE AUDIT: Starting comprehensive voice analysis...');
      console.log(`📊 Total voices detected: ${voices.length}`);
      
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
          reasoning: genderAnalysis.reasoning
        };
      });

      const spanishVoices = auditResults.filter(r => r.isSpanish);
      const femaleSpanishVoices = auditResults.filter(r => r.isFemaleSpanish);

      const summary: VoiceAuditSummary = {
        totalVoices: voices.length,
        spanishVoices: spanishVoices.length,
        femaleSpanishVoices: femaleSpanishVoices.length,
        detectedFemaleSpanishVoices: femaleSpanishVoices,
        allVoices: auditResults,
        auditTimestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };

      // Comprehensive console logging
      console.group('🎤 VOICE AUDIT RESULTS');
      console.log('📅 Timestamp:', summary.auditTimestamp);
      console.log('🖥️ Platform:', summary.platform);
      console.log('🌐 User Agent:', summary.userAgent);
      console.log('📊 Total voices:', summary.totalVoices);
      console.log('🇪🇸 Spanish voices:', summary.spanishVoices);
      console.log('👩 Female Spanish voices:', summary.femaleSpanishVoices);
      
      console.group('🔍 ALL VOICES DETAILED ANALYSIS');
      auditResults.forEach((result, index) => {
        console.group(`Voice ${index + 1}: ${result.name}`);
        console.log('Language:', result.lang);
        console.log('Local Service:', result.localService);
        console.log('Default:', result.default);
        console.log('Is Spanish:', result.isSpanish);
        console.log('Is Female Spanish:', result.isFemaleSpanish);
        console.log('Confidence:', result.confidence);
        console.log('Reasoning:', result.reasoning);
        console.groupEnd();
      });
      console.groupEnd();

      if (femaleSpanishVoices.length > 0) {
        console.group('✅ DETECTED FEMALE SPANISH VOICES');
        femaleSpanishVoices.forEach((result, index) => {
          console.log(`${index + 1}. ${result.name} (${result.lang}) - ${result.confidence} confidence`);
          console.log(`   Reasoning: ${result.reasoning}`);
          console.log(`   Local: ${result.localService}, Default: ${result.default}`);
        });
        console.groupEnd();
      } else {
        console.warn('⚠️ NO FEMALE SPANISH VOICES DETECTED');
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
