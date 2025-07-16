
interface VoiceTestResult {
  voice: SpeechSynthesisVoice;
  success: boolean;
  error?: string;
  latency?: number;
  testPhrase: string;
}

interface ComprehensiveVoiceAudit {
  timestamp: string;
  userAgent: string;
  platform: string;
  totalVoices: number;
  spanishVoices: SpeechSynthesisVoice[];
  testResults: VoiceTestResult[];
  recommendedVoice: SpeechSynthesisVoice | null;
  failureReasons: string[];
  diagnostics: {
    speechSynthesisSupported: boolean;
    voicesLoaded: boolean;
    autoplayRestricted: boolean;
    permissionsRequired: boolean;
  };
}

const SPANISH_TEST_PHRASE = "Esta es una prueba de voz en español. Probando la síntesis de voz.";
const SPANISH_LOCALES = [
  'es', 'es-es', 'es-mx', 'es-ar', 'es-co', 'es-pe', 'es-ve', 'es-cl', 'es-ec',
  'es-gt', 'es-cu', 'es-bo', 'es-do', 'es-hn', 'es-py', 'es-sv', 'es-ni',
  'es-cr', 'es-pa', 'es-uy', 'es-pr', 'es-us'
];

export const testVoicePlayback = (voice: SpeechSynthesisVoice, testPhrase: string): Promise<VoiceTestResult> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let resolved = false;
    
    const resolveTest = (success: boolean, error?: string) => {
      if (!resolved) {
        resolved = true;
        const latency = Date.now() - startTime;
        resolve({
          voice,
          success,
          error,
          latency,
          testPhrase
        });
      }
    };

    try {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(testPhrase);
      utterance.voice = voice;
      utterance.volume = 0.1; // Very quiet for testing
      utterance.rate = 2.0; // Fast test
      utterance.pitch = 1.0;

      // Set up timeout
      const timeout = setTimeout(() => {
        resolveTest(false, 'Test timeout - voice may not be functional');
      }, 3000);

      utterance.onstart = () => {
        clearTimeout(timeout);
        // Let it play for a moment then stop
        setTimeout(() => {
          window.speechSynthesis.cancel();
          resolveTest(true);
        }, 500);
      };

      utterance.onend = () => {
        clearTimeout(timeout);
        resolveTest(true);
      };

      utterance.onerror = (event) => {
        clearTimeout(timeout);
        resolveTest(false, `Voice error: ${event.error}`);
      };

      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      resolveTest(false, `Exception during voice test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
};

export const identifySpanishVoices = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] => {
  return voices.filter(voice => {
    const lang = voice.lang.toLowerCase();
    return SPANISH_LOCALES.some(locale => lang.startsWith(locale));
  });
};

export const detectVoiceGender = (voice: SpeechSynthesisVoice): 'female' | 'male' | 'unknown' => {
  const name = voice.name.toLowerCase();
  
  // Female indicators
  const femaleIndicators = [
    'mónica', 'monica', 'elena', 'conchita', 'pilar', 'esperanza', 'paloma',
    'paulina', 'angelica', 'maria', 'rosa', 'lucia', 'ana', 'laura', 'isabel',
    'female', 'mujer', 'woman', 'girl', 'chica', 'femenina'
  ];
  
  // Male indicators
  const maleIndicators = [
    'diego', 'carlos', 'jorge', 'miguel', 'juan', 'pedro', 'antonio',
    'male', 'hombre', 'man', 'boy', 'chico', 'masculino'
  ];
  
  if (femaleIndicators.some(indicator => name.includes(indicator))) {
    return 'female';
  }
  
  if (maleIndicators.some(indicator => name.includes(indicator))) {
    return 'male';
  }
  
  return 'unknown';
};

export const performComprehensiveVoiceAudit = async (): Promise<ComprehensiveVoiceAudit> => {
  console.log('🔍 COMPREHENSIVE TTS VOICE AUDIT: Starting...');
  
  const audit: ComprehensiveVoiceAudit = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    totalVoices: 0,
    spanishVoices: [],
    testResults: [],
    recommendedVoice: null,
    failureReasons: [],
    diagnostics: {
      speechSynthesisSupported: 'speechSynthesis' in window,
      voicesLoaded: false,
      autoplayRestricted: false,
      permissionsRequired: false
    }
  };

  // Check basic speech synthesis support
  if (!audit.diagnostics.speechSynthesisSupported) {
    audit.failureReasons.push('Speech Synthesis API not supported in this browser');
    return audit;
  }

  // Wait for voices to load
  const voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const getVoices = () => {
      const voicesList = window.speechSynthesis.getVoices();
      if (voicesList.length > 0) {
        resolve(voicesList);
      } else {
        const handleVoicesChanged = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(window.speechSynthesis.getVoices());
        };
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        
        // Fallback timeout
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(window.speechSynthesis.getVoices());
        }, 3000);
      }
    };
    getVoices();
  });

  audit.totalVoices = voices.length;
  audit.diagnostics.voicesLoaded = voices.length > 0;

  if (voices.length === 0) {
    audit.failureReasons.push('No voices available - system TTS may be disabled');
    return audit;
  }

  // Identify Spanish voices
  audit.spanishVoices = identifySpanishVoices(voices);
  
  console.log(`📊 Found ${audit.totalVoices} total voices, ${audit.spanishVoices.length} Spanish voices`);

  if (audit.spanishVoices.length === 0) {
    audit.failureReasons.push('No Spanish voices found - may need to install Spanish language pack');
    
    // Test system default as fallback
    const defaultVoices = voices.filter(v => v.default);
    if (defaultVoices.length > 0) {
      console.log('🔄 Testing system default voice as fallback...');
      const testResult = await testVoicePlayback(defaultVoices[0], SPANISH_TEST_PHRASE);
      audit.testResults.push(testResult);
      if (testResult.success) {
        audit.recommendedVoice = defaultVoices[0];
        audit.failureReasons.push('Using system default voice - Spanish pronunciation may be poor');
      }
    }
    
    return audit;
  }

  // Test all Spanish voices
  console.log('🎤 Testing Spanish voices for compatibility...');
  for (const voice of audit.spanishVoices) {
    console.log(`Testing voice: ${voice.name} (${voice.lang})`);
    const testResult = await testVoicePlayback(voice, SPANISH_TEST_PHRASE);
    audit.testResults.push(testResult);
    
    // Use first successful voice as recommended
    if (testResult.success && !audit.recommendedVoice) {
      audit.recommendedVoice = voice;
    }
    
    // Small delay between tests to prevent issues
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Check for autoplay restrictions
  const successfulTests = audit.testResults.filter(r => r.success);
  if (successfulTests.length === 0 && audit.spanishVoices.length > 0) {
    audit.diagnostics.autoplayRestricted = true;
    audit.failureReasons.push('All Spanish voices failed - may be autoplay restricted');
  }

  console.log('✅ COMPREHENSIVE TTS AUDIT COMPLETED');
  console.log(`📈 Results: ${successfulTests.length}/${audit.spanishVoices.length} Spanish voices working`);
  
  return audit;
};

export const generateAuditReport = (audit: ComprehensiveVoiceAudit): string => {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('COMPREHENSIVE TTS VOICE AUDIT REPORT');
  lines.push('='.repeat(60));
  lines.push(`Timestamp: ${audit.timestamp}`);
  lines.push(`Platform: ${audit.platform}`);
  lines.push(`User Agent: ${audit.userAgent}`);
  lines.push('');
  
  lines.push('SYSTEM DIAGNOSTICS:');
  lines.push(`✓ Speech Synthesis Supported: ${audit.diagnostics.speechSynthesisSupported}`);
  lines.push(`✓ Voices Loaded: ${audit.diagnostics.voicesLoaded}`);
  lines.push(`✓ Total Voices Available: ${audit.totalVoices}`);
  lines.push(`✓ Spanish Voices Found: ${audit.spanishVoices.length}`);
  lines.push('');
  
  if (audit.spanishVoices.length > 0) {
    lines.push('SPANISH VOICES DETECTED:');
    audit.spanishVoices.forEach((voice, index) => {
      const gender = detectVoiceGender(voice);
      lines.push(`${index + 1}. ${voice.name} (${voice.lang})`);
      lines.push(`   Gender: ${gender}, Local: ${voice.localService}, Default: ${voice.default}`);
    });
    lines.push('');
    
    lines.push('VOICE TEST RESULTS:');
    audit.testResults.forEach((result, index) => {
      const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
      lines.push(`${index + 1}. ${result.voice.name}: ${status}`);
      if (result.success) {
        lines.push(`   Latency: ${result.latency}ms`);
      } else {
        lines.push(`   Error: ${result.error}`);
      }
    });
    lines.push('');
  }
  
  if (audit.recommendedVoice) {
    lines.push('RECOMMENDED VOICE:');
    lines.push(`✅ ${audit.recommendedVoice.name} (${audit.recommendedVoice.lang})`);
    lines.push(`   Gender: ${detectVoiceGender(audit.recommendedVoice)}`);
    lines.push(`   Local: ${audit.recommendedVoice.localService}, Default: ${audit.recommendedVoice.default}`);
  } else {
    lines.push('❌ NO WORKING VOICE FOUND');
  }
  lines.push('');
  
  if (audit.failureReasons.length > 0) {
    lines.push('ISSUES DETECTED:');
    audit.failureReasons.forEach((reason, index) => {
      lines.push(`${index + 1}. ${reason}`);
    });
    lines.push('');
  }
  
  lines.push('TROUBLESHOOTING RECOMMENDATIONS:');
  if (audit.spanishVoices.length === 0) {
    lines.push('• Install Spanish language pack in your operating system');
    lines.push('• Enable text-to-speech in system accessibility settings');
  }
  if (audit.diagnostics.autoplayRestricted) {
    lines.push('• Click to enable audio playback (browser autoplay policy)');
    lines.push('• Check browser permissions for audio/microphone');
  }
  if (!audit.recommendedVoice && audit.totalVoices > 0) {
    lines.push('• Try using system default voice as fallback');
    lines.push('• Update browser to latest version');
  }
  
  lines.push('='.repeat(60));
  
  return lines.join('\n');
};
