
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Critical: Natural language post-processing filter for clean Spanish output
function cleanNaturalLanguageResponse(text: string): string {
  if (!text) return '';
  
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
    .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
    .replace(/`(.*?)`/g, '$1') // Remove inline code `text`
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/^\s*[-*+]\s/gm, '') // Remove list bullets
    .replace(/^\s*\d+\.\s/gm, '') // Remove numbered lists
    
    // Clean whitespace and formatting
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/\s{2,}/g, ' ') // Multiple spaces to single space
    .replace(/\t/g, ' ') // Tabs to spaces
    
    // Remove emojis and special characters (keep Spanish punctuation)
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    
    // Clean up punctuation
    .replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ.,;:¿?¡!()$€-]/g, '') // Keep only Spanish chars and basic punctuation
    .replace(/\.{2,}/g, '.') // Multiple dots to single dot
    .replace(/,{2,}/g, ',') // Multiple commas to single comma
    
    // Final cleanup
    .trim()
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .replace(/\n\s*\n/g, '\n'); // Remove empty lines
}

// CRITICAL: Database-driven response validation to prevent product availability inconsistencies
function validateResponseConsistency(aiResponse: string, filteredProducts: any[], userQuery: string): string {
  console.log(`🔍 VALIDATION: Checking response consistency with ${filteredProducts.length} products found`);
  
  if (!aiResponse || !Array.isArray(filteredProducts)) {
    console.log('⚠️ VALIDATION: Invalid input parameters');
    return aiResponse || 'Lo siento, hubo un problema al procesar tu consulta.';
  }

  const hasProducts = filteredProducts.length > 0;
  const lowerResponse = aiResponse.toLowerCase();
  
  // Patterns that indicate "no products available" in Spanish
  const noProductsPatterns = [
    /no tengo|no tenemos|no hay|no existe|no encontr|no disponib|no contamos|sin productos|agotado/,
    /no puedo encontrar|no logro encontrar|no hay coincidencias|no hay resultados/,
    /lo siento.*no.*dispon|desafortunadamente.*no/
  ];

  const indicatesNoProducts = noProductsPatterns.some(pattern => pattern.test(lowerResponse));

  if (hasProducts && indicatesNoProducts) {
    // CRITICAL FIX: AI claims no products but DB has results - Replace with accurate response
    console.log('🔧 CRITICAL FIX: AI claimed no products but database returned results. Generating accurate response.');
    
    const productSummaries = filteredProducts.slice(0, 3).map(p => 
      `${p.nombre} por ${p.precio} dólares (${p.cantidad_disponible} disponibles)`
    ).join(', ');
    
    const categoryList = [...new Set(filteredProducts.map(p => p.categoria))].join(', ');
    const priceRange = {
      min: Math.min(...filteredProducts.map(p => p.precio)),
      max: Math.max(...filteredProducts.map(p => p.precio))
    };

    const correctedResponse = `¡Perfecto! Sí tengo opciones que te pueden interesar. Encontré ${filteredProducts.length} producto${filteredProducts.length > 1 ? 's' : ''} disponible${filteredProducts.length > 1 ? 's' : ''} en ${categoryList}. Por ejemplo: ${productSummaries}. Los precios van desde ${priceRange.min} hasta ${priceRange.max} dólares. ¿Te gustaría que te dé más detalles sobre alguno de estos productos?`;
    
    console.log('✅ FIXED: Generated accurate response based on actual product data');
    return correctedResponse;
  }

  if (!hasProducts && !indicatesNoProducts) {
    // Edge case: AI mentions products but none exist in filtered results
    console.log('🔧 EDGE CASE FIX: AI mentioned products but none found in filtered results');
    return 'Lo siento, no encontré productos que coincidan exactamente con tu búsqueda. ¿Podrías ser más específico o te gustaría que te sugiera algunas alternativas de nuestro catálogo?';
  }

  // Response is consistent with database state
  console.log('✅ VALIDATION PASSED: Response is consistent with database state');
  return aiResponse;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();
    console.log('Received chat request:', { message, conversationId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch all available products from database
    console.log('Fetching products from database...');
    const { data: productos, error: productError } = await supabase
      .from('productos')
      .select('*')
      .order('categoria')
      .order('nombre');

    if (productError) {
      console.error('Database error:', productError);
      throw new Error(`Failed to fetch products: ${productError.message}`);
    }

    console.log(`Found ${productos?.length || 0} products in database`);

    // Create context for OpenAI with real product data
    const productContext = productos?.map(p => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      descripcion: p.descripcion,
      cantidad_disponible: p.cantidad_disponible,
    })) || [];

    // Enhanced system prompt for natural, clean Spanish responses
    const systemPrompt = `Eres un asistente de compras especializado para StrateAI. Tu trabajo es ayudar a los usuarios a encontrar productos específicos basándote ÚNICAMENTE en el inventario real disponible.

PRODUCTOS DISPONIBLES:
${JSON.stringify(productContext, null, 2)}

REGLAS CRÍTICAS:
1. SOLO puedes recomendar productos que existen en la lista anterior
2. SIEMPRE menciona el precio exacto, categoría y disponibilidad real
3. Si un producto no está disponible (cantidad_disponible = 0), menciona que está agotado
4. Responde en español natural, conversacional y claro - NUNCA uses markdown, asteriscos, o formateo especial
5. Si el usuario busca algo que no existe, sugiere alternativas similares del inventario
6. NUNCA inventes productos o especificaciones que no están en la base de datos
7. Tus respuestas serán leídas en voz alta, así que deben sonar naturales al hablar

FORMATO DE RESPUESTA:
- Responde de manera conversacional, como si hablaras con un amigo
- Incluye detalles específicos como precio y características
- Usa lenguaje natural sin formateo especial
- Al final de tu respuesta, incluye un objeto JSON con los filtros sugeridos en este formato:
FILTROS_SUGERIDOS: {"categoria": "categoria_exacta", "precioMin": numero, "precioMax": numero, "searchTerm": "termino"}

Ejemplo: Si alguien busca "televisores baratos", responde explicando las opciones naturalmente y termina con:
FILTROS_SUGERIDOS: {"categoria": "Televisores", "precioMax": 500}`;

    // Call OpenAI API
    console.log('Calling OpenAI API...');
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
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const rawAiResponse = data.choices[0].message.content;
    
    // Extract filters from AI response BEFORE cleaning
    let suggestedFilters = {};
    const filterMatch = rawAiResponse.match(/FILTROS_SUGERIDOS:\s*({.*?})/);
    if (filterMatch) {
      try {
        suggestedFilters = JSON.parse(filterMatch[1]);
        console.log('Extracted filters:', suggestedFilters);
      } catch (e) {
        console.log('Could not parse suggested filters:', e);
      }
    }

    // CRITICAL: Apply suggested filters to get actual filtered products for validation
    let filteredProducts = productos || [];
    if (Object.keys(suggestedFilters).length > 0) {
      console.log('🔍 Applying suggested filters to validate response accuracy...');
      
      const filters = suggestedFilters as any;
      
      if (filters.categoria) {
        filteredProducts = filteredProducts.filter(p => 
          p.categoria.toLowerCase() === filters.categoria.toLowerCase()
        );
      }
      
      if (filters.precioMin !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.precio >= filters.precioMin);
      }
      
      if (filters.precioMax !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.precio <= filters.precioMax);
      }
      
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.nombre.toLowerCase().includes(searchTerm) || 
          p.descripcion.toLowerCase().includes(searchTerm)
        );
      }
      
      console.log(`🔍 FILTER RESULTS: ${filteredProducts.length} products match the suggested filters`);
    }

    // CRITICAL: Database-driven response validation - This prevents inconsistencies
    const rawResponseWithoutFilters = rawAiResponse.replace(/FILTROS_SUGERIDOS:\s*{.*?}/, '').trim();
    const validatedResponse = validateResponseConsistency(rawResponseWithoutFilters, filteredProducts, message);
    
    // Apply natural language post-processing filter after validation
    const cleanResponse = cleanNaturalLanguageResponse(validatedResponse);
    
    console.log('Raw AI response:', rawResponseWithoutFilters);
    console.log('Validated response:', validatedResponse);
    console.log('Final clean response:', cleanResponse);

    // Validate cleaned response is not empty
    if (!cleanResponse || cleanResponse.length < 10) {
      throw new Error('Cleaned response is too short or empty');
    }

    // Store the bot response in database
    if (conversationId) {
      const { error: messageError } = await supabase
        .from('mensajes')
        .insert({
          conversacion_id: conversationId,
          sender: 'bot',
          content: cleanResponse, // Store final validated and cleaned response
        });

      if (messageError) {
        console.error('Error storing bot message:', messageError);
      }
    }

    console.log('Chat assistant response completed successfully');

    return new Response(JSON.stringify({
      response: cleanResponse, // Return validated and cleaned response
      filters: suggestedFilters,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat assistant:', error);
    
    // Return graceful error response (also cleaned)
    const errorResponse = {
      response: cleanNaturalLanguageResponse('Lo siento, hubo un problema al procesar tu consulta. Por favor, intenta de nuevo en unos momentos.'),
      filters: {},
      success: false,
      error: error.message
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
