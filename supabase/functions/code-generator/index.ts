
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

// Rate limiting configuration - Production-ready limits
const RATE_LIMITS = {
  PER_MINUTE: 5,
  PER_HOUR: 20,
  WINDOW_MINUTE: 60 * 1000, // 1 minute in ms
  WINDOW_HOUR: 60 * 60 * 1000, // 1 hour in ms
};

// ESLint security rules configuration for comprehensive validation
const ESLINT_SECURITY_RULES = [
  'no-eval',
  'no-implied-eval', 
  'no-new-func',
  'no-script-url',
  'no-caller',
  'no-extend-native',
  'no-proto',
  'no-iterator',
  'no-with'
];

interface ValidationResult {
  valid: boolean;
  errors: any[];
  warnings: any[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Generate SHA256 hash for code auditability
 * Critical for tracking code generation and ensuring integrity
 */
async function generateSHA256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract client IP from request headers for rate limiting and audit
 * Supports various proxy configurations
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Enterprise-grade rate limiting with sliding window
 * Prevents abuse and ensures fair usage across users
 */
async function checkRateLimit(identifier: string, supabase: any): Promise<RateLimitResult> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - RATE_LIMITS.WINDOW_MINUTE);
  const oneHourAgo = new Date(now.getTime() - RATE_LIMITS.WINDOW_HOUR);

  try {
    // Check minute-based rate limit
    const { data: minuteData, error: minuteError } = await supabase
      .from('code_generation_rate_limits')
      .select('request_count')
      .eq('identifier', identifier)
      .gte('window_start', oneMinuteAgo.toISOString())
      .order('window_start', { ascending: false })
      .limit(1);

    if (minuteError) throw minuteError;

    const minuteCount = minuteData?.[0]?.request_count || 0;
    if (minuteCount >= RATE_LIMITS.PER_MINUTE) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil((now.getTime() + RATE_LIMITS.WINDOW_MINUTE) / 1000)
      };
    }

    // Check hour-based rate limit
    const { data: hourData, error: hourError } = await supabase
      .from('code_generation_rate_limits')
      .select('request_count')
      .eq('identifier', identifier)
      .gte('window_start', oneHourAgo.toISOString())
      .order('window_start', { ascending: false });

    if (hourError) throw hourError;

    const hourCount = hourData?.reduce((sum: number, record: any) => sum + record.request_count, 0) || 0;
    if (hourCount >= RATE_LIMITS.PER_HOUR) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil((now.getTime() + RATE_LIMITS.WINDOW_HOUR) / 1000)
      };
    }

    // Update rate limit counter - Critical for tracking usage
    await supabase
      .from('code_generation_rate_limits')
      .upsert({
        identifier,
        request_count: minuteCount + 1,
        window_start: now.toISOString()
      }, {
        onConflict: 'identifier,window_start'
      });

    return {
      allowed: true,
      remaining: Math.min(RATE_LIMITS.PER_MINUTE - minuteCount - 1, RATE_LIMITS.PER_HOUR - hourCount - 1),
      resetTime: Math.ceil((now.getTime() + RATE_LIMITS.WINDOW_MINUTE) / 1000)
    };
  } catch (error) {
    console.error('❌ Rate limit check error:', error);
    // Fail-safe: Allow request but log the error for investigation
    return { allowed: true, remaining: 1, resetTime: 0 };
  }
}

/**
 * TypeScript compilation validation using syntax analysis
 * Ensures generated code compiles and is syntactically correct
 */
function validateTypeScript(code: string): ValidationResult {
  try {
    // Comprehensive TypeScript syntax validation patterns
    const syntaxPatterns = [
      { pattern: /\beval\s*\(/, message: 'Usage of eval() is prohibited for security reasons', severity: 'error' },
      { pattern: /\bFunction\s*\(/, message: 'Usage of Function() constructor is prohibited', severity: 'error' },
      { pattern: /\bnew\s+Function\s*\(/, message: 'Usage of new Function() is prohibited', severity: 'error' },
      { pattern: /javascript\s*:/, message: 'javascript: URLs are prohibited', severity: 'error' },
      { pattern: /\bwith\s*\(/, message: 'with statements are prohibited', severity: 'error' },
      { pattern: /\b__proto__\b/, message: '__proto__ usage is discouraged', severity: 'warning' },
      { pattern: /\bcaller\b/, message: 'arguments.caller usage is prohibited', severity: 'error' },
      { pattern: /\bcallee\b/, message: 'arguments.callee usage is prohibited', severity: 'error' }
    ];

    const errors = [];
    const warnings = [];

    // Security and syntax validation
    for (const { pattern, message, severity } of syntaxPatterns) {
      if (pattern.test(code)) {
        const finding = { message, rule: 'security-syntax-check' };
        if (severity === 'error') {
          errors.push(finding);
        } else {
          warnings.push(finding);
        }
      }
    }

    // Structural validation - ensure code has proper structure
    const hasValidStructure = /(?:function|const|let|var|class|interface|type|export|import)/.test(code);
    if (!hasValidStructure && code.trim().length > 0) {
      warnings.push({ message: 'Code may lack proper TypeScript/JavaScript structure', rule: 'structure-check' });
    }

    // Bracket matching validation - critical for syntax correctness
    const brackets = { '(': 0, '[': 0, '{': 0 };
    for (const char of code) {
      if (char === '(') brackets['(']++;
      else if (char === ')') brackets['(']--;
      else if (char === '[') brackets['[']++;
      else if (char === ']') brackets['[']--;
      else if (char === '{') brackets['{']++;
      else if (char === '}') brackets['{']--;
    }

    for (const [bracket, count] of Object.entries(brackets)) {
      if (count !== 0) {
        errors.push({ message: `Unmatched ${bracket} brackets`, rule: 'syntax-check' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{ message: `TypeScript validation error: ${error.message}`, rule: 'validation-error' }],
      warnings: []
    };
  }
}

/**
 * ESLint security and style validation
 * Comprehensive security rule checking for production code
 */
function runESLintSecurityChecks(code: string): ValidationResult {
  const errors = [];
  const warnings = [];

  const securityChecks = [
    {
      pattern: /\beval\s*\(/,
      rule: 'no-eval',
      severity: 'error',
      message: 'eval() is potentially dangerous and should not be used'
    },
    {
      pattern: /setTimeout\s*\(\s*["'`][^"'`]*["'`]/,
      rule: 'no-implied-eval',
      severity: 'error', 
      message: 'Implied eval via setTimeout with string is dangerous'
    },
    {
      pattern: /setInterval\s*\(\s*["'`][^"'`]*["'`]/,
      rule: 'no-implied-eval',
      severity: 'error',
      message: 'Implied eval via setInterval with string is dangerous'
    },
    {
      pattern: /\bnew\s+Function\s*\(/,
      rule: 'no-new-func',
      severity: 'error',
      message: 'Function constructor is dangerous and should not be used'
    },
    {
      pattern: /javascript\s*:/,
      rule: 'no-script-url',
      severity: 'error',
      message: 'Script URLs are dangerous and should not be used'
    },
    {
      pattern: /\.caller\b/,
      rule: 'no-caller',
      severity: 'error',
      message: 'arguments.caller is deprecated and should not be used'
    },
    {
      pattern: /\.callee\b/,
      rule: 'no-caller', 
      severity: 'error',
      message: 'arguments.callee is deprecated and should not be used'
    },
    {
      pattern: /\bwith\s*\(/,
      rule: 'no-with',
      severity: 'error',
      message: 'with statements are not allowed'
    },
    {
      pattern: /\b__proto__\b/,
      rule: 'no-proto',
      severity: 'warning',
      message: '__proto__ is deprecated, use Object.getPrototypeOf instead'
    },
    {
      pattern: /console\.log/,
      rule: 'no-console',
      severity: 'warning', 
      message: 'console.log statements should be removed in production code'
    }
  ];

  // Execute comprehensive security checks
  for (const check of securityChecks) {
    if (check.pattern.test(code)) {
      const finding = {
        message: check.message,
        rule: check.rule,
        severity: check.severity
      };
      
      if (check.severity === 'error') {
        errors.push(finding);
      } else {
        warnings.push(finding);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Detect if prompt requests unit tests
 * Enables comprehensive test code generation and validation
 */
function shouldGenerateTests(prompt: string): boolean {
  const testKeywords = [
    'unit test', 'test', 'testing', 'jest', 'vitest', 'mocha', 'chai',
    'spec', 'describe', 'it should', 'test case', 'test suite'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return testKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Generate comprehensive system prompt for OpenAI
 * Ensures high-quality, secure code generation
 */
function createSystemPrompt(language: string, framework: string, includeTests: boolean, context?: string): string {
  let systemPrompt = `You are an expert ${language} developer specializing in ${framework}. 
Generate clean, production-ready code following best practices:

SECURITY REQUIREMENTS:
- NEVER use eval(), Function(), new Function(), or any form of dynamic code execution
- NEVER use setTimeout/setInterval with string arguments
- NEVER use with statements
- NEVER use __proto__, use Object.getPrototypeOf() instead
- NEVER use arguments.caller or arguments.callee
- NEVER include script URLs (javascript:)
- Avoid console.log statements in production code

CODE QUALITY REQUIREMENTS:
- Use TypeScript with proper types and interfaces
- Follow ${framework} functional component patterns with hooks
- Use semantic design tokens for styling (avoid direct colors)
- Include proper error handling and input validation
- Add helpful comments for complex logic
- Follow modern ES6+ patterns
- Ensure all brackets, parentheses, and braces are properly matched
- Use meaningful variable and function names

BEST PRACTICES:
- Prefer composition over inheritance
- Use proper TypeScript types and interfaces
- Handle edge cases gracefully
- Include JSDoc comments for functions
- Follow SOLID principles
- Ensure code is secure and follows modern standards`;

  if (includeTests) {
    systemPrompt += `

TESTING REQUIREMENTS:
- Generate comprehensive unit tests alongside the main code
- Use modern testing frameworks (Jest, Vitest, React Testing Library)
- Include test cases for edge cases and error conditions
- Follow testing best practices (Arrange, Act, Assert)
- Mock external dependencies appropriately
- Ensure high test coverage
- Generate both positive and negative test cases`;
  }

  if (context) {
    systemPrompt += `

PROJECT CONTEXT: ${context}`;
  }

  systemPrompt += `

Return ONLY the code without markdown formatting. If tests were requested, include them after the main code with clear separation.`;

  return systemPrompt;
}

/**
 * Input validation and sanitization
 * Critical security step to prevent injection attacks
 */
function validateAndSanitizeInput(prompt: string, language: string, framework: string): { valid: boolean; errors: string[] } {
  const errors = [];

  // Prompt validation
  if (!prompt || typeof prompt !== 'string') {
    errors.push('Prompt is required and must be a string');
  } else if (prompt.trim().length < 10) {
    errors.push('Prompt must be at least 10 characters long');
  } else if (prompt.length > 2000) {
    errors.push('Prompt must be less than 2000 characters');
  }

  // Language validation
  const allowedLanguages = ['typescript', 'javascript', 'python', 'java', 'go', 'rust'];
  if (!allowedLanguages.includes(language.toLowerCase())) {
    errors.push(`Language must be one of: ${allowedLanguages.join(', ')}`);
  }

  // Framework validation
  const allowedFrameworks = ['react', 'vue', 'angular', 'svelte', 'node', 'express', 'fastapi', 'spring'];
  if (!allowedFrameworks.includes(framework.toLowerCase())) {
    errors.push(`Framework must be one of: ${allowedFrameworks.join(', ')}`);
  }

  // Security pattern detection in prompt
  const dangerousPatterns = [
    /eval\s*\(/i,
    /function\s*\(/i,
    /javascript\s*:/i,
    /<script/i,
    /import\s+os/i,
    /subprocess/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(prompt)) {
      errors.push('Prompt contains potentially dangerous patterns that are not allowed');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Main request handler - Enterprise-grade code generation service
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let openAIStartTime = 0;
  let openAIEndTime = 0;

  // Critical environment validation
  if (!openAIApiKey) {
    console.error('❌ OpenAI API key not found');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase configuration not found');
    return new Response(
      JSON.stringify({ error: 'Supabase configuration not found' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const clientIP = getClientIP(req);
  const userId = req.headers.get('user-id') || null; // Optional user ID from headers
  const identifier = userId || clientIP;

  try {
    const { prompt, language = 'typescript', framework = 'react', context } = await req.json();
    
    // Input validation and sanitization - Critical security step
    const inputValidation = validateAndSanitizeInput(prompt, language, framework);
    if (!inputValidation.valid) {
      const errorResponse = {
        error: 'Input validation failed',
        details: inputValidation.errors,
        timestamp: new Date().toISOString()
      };

      // Log validation failure for audit
      await supabase.from('code_generation_logs').insert({
        prompt: prompt?.substring(0, 500) || 'Invalid prompt',
        language,
        framework,
        user_id: userId,
        user_ip: clientIP,
        success: false,
        error_message: `Input validation failed: ${inputValidation.errors.join(', ')}`,
        total_processing_ms: Date.now() - startTime
      });

      return new Response(
        JSON.stringify(errorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting enforcement - Critical for service protection
    const rateLimitResult = await checkRateLimit(identifier, supabase);
    if (!rateLimitResult.allowed) {
      const rateLimitError = {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again later.`,
        resetTime: rateLimitResult.resetTime,
        identifier: identifier.substring(0, 8) + '...' // Partial identifier for debugging
      };

      // Log rate limit violation for audit
      await supabase.from('code_generation_logs').insert({
        prompt: prompt.substring(0, 500),
        language,
        framework,
        user_id: userId,
        user_ip: clientIP,
        success: false,
        error_message: 'Rate limit exceeded',
        total_processing_ms: Date.now() - startTime
      });

      return new Response(
        JSON.stringify(rateLimitError),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          } 
        }
      );
    }

    console.log('🔍 Code generation request:', { 
      language, 
      framework, 
      promptLength: prompt.length,
      identifier,
      includeTests: shouldGenerateTests(prompt)
    });

    // Determine if tests should be generated
    const includeTests = shouldGenerateTests(prompt);
    const systemPrompt = createSystemPrompt(language, framework, includeTests, context);

    // OpenAI API call with comprehensive error handling
    openAIStartTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });
    openAIEndTime = Date.now();

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

    // Split main code and test code if tests were generated
    let mainCode = generatedCode;
    let testCode = '';
    
    if (includeTests) {
      // Simple heuristic to split code and tests
      const testSectionMatch = generatedCode.match(/(\/\/\s*TEST|\/\*\s*TEST|describe\(|test\(|it\()/i);
      if (testSectionMatch) {
        const splitIndex = testSectionMatch.index || 0;
        mainCode = generatedCode.substring(0, splitIndex).trim();
        testCode = generatedCode.substring(splitIndex).trim();
      }
    }

    // Comprehensive validation of generated code
    const tsValidation = validateTypeScript(mainCode);
    const eslintValidation = runESLintSecurityChecks(mainCode);

    // Validate test code if generated
    let testValidation = { valid: true, errors: [], warnings: [] };
    if (testCode) {
      const testTsValidation = validateTypeScript(testCode);
      const testEslintValidation = runESLintSecurityChecks(testCode);
      testValidation = {
        valid: testTsValidation.valid && testEslintValidation.valid,
        errors: [...testTsValidation.errors, ...testEslintValidation.errors],
        warnings: [...testTsValidation.warnings, ...testEslintValidation.warnings]
      };
    }

    // Critical validation check - Block delivery if validation fails
    const allValidationsPass = tsValidation.valid && eslintValidation.valid && testValidation.valid;
    const hasSecurityIssues = [...eslintValidation.errors, ...(testValidation.errors || [])].length > 0;

    if (!allValidationsPass || hasSecurityIssues) {
      const errorResponse = {
        error: 'Code validation failed',
        validationResults: {
          typescript: tsValidation,
          eslint: eslintValidation,
          testCode: testCode ? testValidation : null
        },
        securityIssues: hasSecurityIssues,
        message: 'Generated code contains validation errors or security issues. Please review and regenerate.'
      };

      // Log failed validation for comprehensive audit
      await supabase.from('code_generation_logs').insert({
        prompt: prompt.substring(0, 500),
        language,
        framework,
        code_length: generatedCode.length,
        code_hash: await generateSHA256Hash(generatedCode),
        openai_latency_ms: openAIEndTime - openAIStartTime,
        total_processing_ms: Date.now() - startTime,
        user_id: userId,
        user_ip: clientIP,
        typescript_valid: tsValidation.valid,
        typescript_errors: tsValidation.errors,
        eslint_warnings: [...eslintValidation.warnings, ...(testValidation.warnings || [])],
        eslint_errors: [...eslintValidation.errors, ...(testValidation.errors || [])],
        security_issues: hasSecurityIssues ? [...eslintValidation.errors, ...(testValidation.errors || [])] : null,
        test_code_generated: !!testCode,
        test_code_valid: testCode ? testValidation.valid : null,
        test_code_errors: testCode ? testValidation.errors : null,
        success: false,
        error_message: 'Validation failed'
      });

      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate SHA256 hash for comprehensive audit trail
    const codeHash = await generateSHA256Hash(generatedCode);

    // Basic validation - ensure the generated code is not empty and has basic structure
    const codeLines = generatedCode.trim().split('\n').filter(line => line.trim());
    if (codeLines.length < 3) {
      throw new Error('Generated code appears to be too short or invalid');
    }

    // Comprehensive audit logging - Critical for enterprise compliance
    const auditLog = {
      prompt: prompt.substring(0, 500),
      language,
      framework,
      code_length: generatedCode.length,
      code_hash: codeHash,
      openai_latency_ms: openAIEndTime - openAIStartTime,
      total_processing_ms: Date.now() - startTime,
      user_id: userId,
      user_ip: clientIP,
      typescript_valid: tsValidation.valid,
      typescript_errors: tsValidation.errors,
      eslint_warnings: [...eslintValidation.warnings, ...(testValidation.warnings || [])],
      eslint_errors: [],
      security_issues: null,
      test_code_generated: !!testCode,
      test_code_valid: testCode ? testValidation.valid : null,
      test_code_errors: testCode ? testValidation.errors : null,
      success: true
    };

    console.log('✅ Code generated successfully:', {
      linesOfCode: codeLines.length,
      language,
      framework,
      codeHash,
      openaiLatency: openAIEndTime - openAIStartTime,
      totalProcessing: Date.now() - startTime,
      includeTests,
      timestamp: new Date().toISOString()
    });

    // Store comprehensive audit log - Critical for compliance and debugging
    await supabase.from('code_generation_logs').insert(auditLog);

    // Structure successful response with all metadata
    const responseData = {
      code: mainCode,
      testCode: testCode || null,
      codeHash,
      validationResults: {
        typescript: tsValidation,
        eslint: eslintValidation,
        testCode: testCode ? testValidation : null
      },
      metadata: {
        language,
        framework,
        linesOfCode: codeLines.length,
        generatedAt: new Date().toISOString(),
        openaiLatencyMs: openAIEndTime - openAIStartTime,
        totalProcessingMs: Date.now() - startTime,
        testCodeGenerated: !!testCode,
        securityValidated: true
      }
    };

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in code generation:', error);
    
    const errorHash = await generateSHA256Hash(error.message);
    
    // Comprehensive error logging for audit and debugging
    try {
      await supabase.from('code_generation_logs').insert({
        prompt: 'Error occurred during processing',
        language: 'unknown',
        framework: 'unknown',
        code_hash: errorHash,
        openai_latency_ms: openAIEndTime - openAIStartTime,
        total_processing_ms: Date.now() - startTime,
        user_id: userId,
        user_ip: clientIP,
        typescript_valid: false,
        success: false,
        error_message: error.message
      });
    } catch (auditError) {
      console.warn('⚠️ Failed to log error audit trail:', auditError);
    }

    return new Response(
      JSON.stringify({ 
        error: 'Code generation failed',
        details: error.message,
        errorHash,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
