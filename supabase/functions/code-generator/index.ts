import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    console.error('❌ OpenAI API key not found');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { prompt, language = 'typescript', framework = 'react', context } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Code generation request:', { language, framework, promptLength: prompt.length });

    // Create system prompt for code generation
    const systemPrompt = `You are an expert ${language} developer specializing in ${framework}. 
Generate clean, production-ready code following best practices:
- Use TypeScript with proper types
- Follow React functional component patterns with hooks
- Use Tailwind CSS for styling with semantic design tokens
- Include proper error handling
- Add helpful comments for complex logic
- Follow the component patterns from the context provided
- Ensure code is secure and follows modern standards

Context about the project: ${context || 'React + TypeScript + Tailwind CSS project'}

Return only the code without markdown formatting or explanations unless specifically requested.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Lower temperature for more consistent code generation
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedCode = data.choices[0]?.message?.content;

    if (!generatedCode) {
      throw new Error('No code generated from OpenAI response');
    }

    // Basic validation - ensure the generated code is not empty and has basic structure
    const codeLines = generatedCode.trim().split('\n').filter(line => line.trim());
    if (codeLines.length < 3) {
      throw new Error('Generated code appears to be too short or invalid');
    }

    // Log successful generation for audit
    console.log('✅ Code generated successfully:', {
      linesOfCode: codeLines.length,
      language,
      framework,
      timestamp: new Date().toISOString()
    });

    // Store audit log in Supabase if configured
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('code_generation_logs').insert({
          prompt: prompt.substring(0, 500), // Truncate for storage
          language,
          framework,
          code_length: generatedCode.length,
          generated_at: new Date().toISOString(),
          success: true
        });
      } catch (auditError) {
        console.warn('⚠️ Failed to log audit trail:', auditError);
        // Don't fail the main request if audit logging fails
      }
    }

    return new Response(
      JSON.stringify({
        code: generatedCode,
        metadata: {
          language,
          framework,
          linesOfCode: codeLines.length,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in code generation:', error);
    
    // Log error for audit if Supabase is configured
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('code_generation_logs').insert({
          prompt: 'Error occurred',
          error_message: error.message,
          generated_at: new Date().toISOString(),
          success: false
        });
      } catch (auditError) {
        console.warn('⚠️ Failed to log error audit trail:', auditError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: 'Code generation failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});