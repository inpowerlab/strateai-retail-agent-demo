
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  lang?: string;
  voice?: string;
  speed?: number;
}

interface TTSResponse {
  success: boolean;
  audioData?: string;
  error?: string;
  fallbackRequired?: boolean;
  metadata?: {
    model: string;
    voice: string;
    textLength: number;
    processingTime: number;
  };
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Enhanced logging function for comprehensive audit trail
function logTTSEvent(event: string, data: any) {
  const timestamp = new Date().toISOString();
  console.log(`🔊 [TTS-${event}] ${timestamp}:`, JSON.stringify(data, null, 2));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let requestData: TTSRequest;

  try {
    // Parse and validate request
    requestData = await req.json();
    
    logTTSEvent('REQUEST_RECEIVED', {
      textLength: requestData.text?.length || 0,
      lang: requestData.lang || 'es',
      voice: requestData.voice || 'nova',
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin')
    });

    // Validate required fields
    if (!requestData.text || requestData.text.trim().length === 0) {
      throw new Error('Text is required and cannot be empty');
    }

    if (!OPENAI_API_KEY) {
      logTTSEvent('CONFIG_ERROR', { error: 'OpenAI API key not configured' });
      throw new Error('TTS service not properly configured');
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

    if (cleanText.length > 4096) {
      logTTSEvent('TEXT_TOO_LONG', { 
        originalLength: cleanText.length,
        maxLength: 4096 
      });
      throw new Error('Text too long for TTS processing (max 4096 characters)');
    }

    // Determine optimal Spanish female voice
    const voiceSelection = requestData.voice || 'nova';
    const spanishFemaleVoices = ['nova', 'onyx', 'alloy'];
    const selectedVoice = spanishFemaleVoices.includes(voiceSelection) ? voiceSelection : 'nova';

    logTTSEvent('OPENAI_REQUEST_START', {
      model: 'tts-1',
      voice: selectedVoice,
      textLength: cleanText.length,
      speed: requestData.speed || 1.0
    });

    // Call OpenAI TTS API
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: cleanText,
        voice: selectedVoice,
        response_format: 'mp3',
        speed: requestData.speed || 1.0,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorDetails;
      
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { message: errorText };
      }

      logTTSEvent('OPENAI_API_ERROR', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        error: errorDetails,
        voice: selectedVoice
      });

      // Determine if this is a recoverable error that should trigger fallback
      const recoverableErrors = [429, 503, 500]; // Rate limit, service unavailable, server error
      const shouldFallback = recoverableErrors.includes(openaiResponse.status);

      const response: TTSResponse = {
        success: false,
        error: `OpenAI TTS failed: ${errorDetails.error?.message || errorText}`,
        fallbackRequired: shouldFallback
      };

      return new Response(JSON.stringify(response), {
        status: shouldFallback ? 200 : 400, // Return 200 for fallback scenarios
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert audio response to base64
    const audioBuffer = await openaiResponse.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    const processingTime = Date.now() - startTime;

    logTTSEvent('SUCCESS', {
      voice: selectedVoice,
      textLength: cleanText.length,
      audioSizeBytes: audioBuffer.byteLength,
      processingTimeMs: processingTime,
      audioSizeKB: Math.round(audioBuffer.byteLength / 1024)
    });

    const response: TTSResponse = {
      success: true,
      audioData: audioBase64,
      metadata: {
        model: 'tts-1',
        voice: selectedVoice,
        textLength: cleanText.length,
        processingTime
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
      fallbackRequired: true // Always allow fallback for unexpected errors
    };

    return new Response(JSON.stringify(response), {
      status: 200, // Return 200 to allow frontend fallback handling
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
