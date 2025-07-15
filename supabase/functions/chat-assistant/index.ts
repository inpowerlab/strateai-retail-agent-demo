
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Prepare system prompt with product data
    const systemPrompt = `Eres un asistente de compras especializado para StrateAI. Tu trabajo es ayudar a los usuarios a encontrar productos específicos basándote ÚNICAMENTE en el inventario real disponible.

PRODUCTOS DISPONIBLES:
${JSON.stringify(productContext, null, 2)}

REGLAS IMPORTANTES:
1. SOLO puedes recomendar productos que existen en la lista anterior
2. SIEMPRE menciona el precio exacto, categoría y disponibilidad real
3. Si un producto no está disponible (cantidad_disponible = 0), menciona que está agotado
4. Proporciona respuestas en español, naturales y útiles
5. Si el usuario busca algo que no existe, sugiere alternativas similares del inventario
6. NUNCA inventes productos o especificaciones que no están en la base de datos

FORMATO DE RESPUESTA:
- Responde de manera conversacional y útil
- Incluye detalles específicos como precio, marca, características
- Al final de tu respuesta, incluye un objeto JSON con los filtros sugeridos en este formato:
FILTROS_SUGERIDOS: {"categoria": "categoria_exacta", "precioMin": numero, "precioMax": numero, "searchTerm": "termino"}

Ejemplo: Si alguien busca "televisores baratos", responde explicando las opciones y termina con:
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

    const aiResponse = data.choices[0].message.content;
    
    // Extract filters from AI response
    let suggestedFilters = {};
    const filterMatch = aiResponse.match(/FILTROS_SUGERIDOS:\s*({.*?})/);
    if (filterMatch) {
      try {
        suggestedFilters = JSON.parse(filterMatch[1]);
        console.log('Extracted filters:', suggestedFilters);
      } catch (e) {
        console.log('Could not parse suggested filters:', e);
      }
    }

    // Clean response (remove filter JSON from user-visible text)
    const cleanResponse = aiResponse.replace(/FILTROS_SUGERIDOS:\s*{.*?}/, '').trim();

    // Store the bot response in database
    if (conversationId) {
      const { error: messageError } = await supabase
        .from('mensajes')
        .insert({
          conversacion_id: conversationId,
          sender: 'bot',
          content: cleanResponse,
        });

      if (messageError) {
        console.error('Error storing bot message:', messageError);
      }
    }

    console.log('Chat assistant response completed successfully');

    return new Response(JSON.stringify({
      response: cleanResponse,
      filters: suggestedFilters,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat assistant:', error);
    
    // Return graceful error response
    const errorResponse = {
      response: 'Lo siento, hubo un problema al procesar tu consulta. Por favor, intenta de nuevo en unos momentos.',
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
