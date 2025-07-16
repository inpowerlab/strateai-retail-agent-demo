
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

interface TTSResponse {
  success: boolean;
  audioData?: string;
  error?: string;
  fallbackRequired?: boolean;
  metadata?: {
    voice: string;
    textLength: number;
    processingTime: number;
    provider: string;
  };
}

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');

// Premium Spanish female voices - Chirp3-HD prioritized
const PREMIUM_SPANISH_VOICES = [
  'es-US-Journey-F', // Chirp3-HD Journey Female
  'es-US-Studio-B', // Studio quality female
  'es-ES-Standard-A', // Spanish Spain female
  'es-MX-Standard-A', // Mexican Spanish female
  'es-US-Standard-A', // US Spanish female
];

function logTTSEvent(event: string, data: any) {
  const timestamp = new Date().toISOString();
  console.log(`🎤 [Google-TTS-${event}] ${timestamp}:`, JSON.stringify(data, null, 2));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let requestData: TTSRequest;

  try {
    requestData = await req.json();
    
    logTTSEvent('REQUEST_RECEIVED', {
      textLength: requestData.text?.length || 0,
      voice: requestData.voice || 'default',
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin')
    });

    // Validate required fields
    if (!requestData.text || requestData.text.trim().length === 0) {
      throw new Error('Text is required and cannot be empty');
    }

    if (!GOOGLE_API_KEY) {
      logTTSEvent('CONFIG_ERROR', { error: 'Google Cloud API key not configured' });
      throw new Error('Google Cloud TTS service not properly configured');
    }

    // Clean and prepare text for TTS
    const cleanText = requestData.text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove markdown italic
      .replace(/`(.*?)`/g, '$1')       // Remove code backticks
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove markdown links
      .replace(/#{1,6}\s*/g, '')       // Remove markdown headers
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim();

    if (cleanText.length > 5000) {
      logTTSEvent('TEXT_TOO_LONG', { 
        originalLength: cleanText.length,
        maxLength: 5000 
      });
      throw new Error('Text too long for TTS processing (max 5000 characters)');
    }

    // Select premium Spanish female voice
    const selectedVoice = requestData.voice && PREMIUM_SPANISH_VOICES.includes(requestData.voice) 
      ? requestData.voice 
      : PREMIUM_SPANISH_VOICES[0]; // Default to Journey-F

    logTTSEvent('GOOGLE_REQUEST_START', {
      voice: selectedVoice,
      textLength: cleanText.length,
      speed: requestData.speed || 1.0
    });

    // Prepare Google Cloud TTS request
    const googleTTSRequest = {
      input: { text: cleanText },
      voice: {
        languageCode: selectedVoice.startsWith('es-US') ? 'es-US' : 'es-ES',
        name: selectedVoice,
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: requestData.speed || 1.0,
        pitch: requestData.pitch || 0.0,
        volumeGainDb: 0.0,
        sampleRateHertz: 24000
      }
    };

    // Call Google Cloud TTS API
    const googleResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleTTSRequest),
      }
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      let errorDetails;
      
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { message: errorText };
      }

      logTTSEvent('GOOGLE_API_ERROR', {
        status: googleResponse.status,
        statusText: googleResponse.statusText,
        error: errorDetails,
        voice: selectedVoice
      });

      // Determine if this should trigger fallback
      const recoverableErrors = [429, 503, 500, 403]; // Rate limit, unavailable, server error, quota
      const shouldFallback = recoverableErrors.includes(googleResponse.status);

      const response: TTSResponse = {
        success: false,
        error: `Google Cloud TTS failed: ${errorDetails.error?.message || errorText}`,
        fallbackRequired: shouldFallback
      };

      return new Response(JSON.stringify(response), {
        status: shouldFallback ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const googleResult = await googleResponse.json();
    
    if (!googleResult.audioContent) {
      throw new Error('No audio content received from Google Cloud TTS');
    }

    const processingTime = Date.now() - startTime;

    logTTSEvent('SUCCESS', {
      voice: selectedVoice,
      textLength: cleanText.length,
      audioSizeBytes: googleResult.audioContent.length,
      processingTimeMs: processingTime,
      provider: 'Google Cloud TTS'
    });

    const response: TTSResponse = {
      success: true,
      audioData: googleResult.audioContent,
      metadata: {
        voice: selectedVoice,
        textLength: cleanText.length,
        processingTime,
        provider: 'Google Cloud TTS'
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logTTSEvent('GENERAL_ERROR', {
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime,
      requestData: requestData || 'failed to parse'
    });

    const response: TTSResponse = {
      success: false,
      error: error.message,
      fallbackRequired: true
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
