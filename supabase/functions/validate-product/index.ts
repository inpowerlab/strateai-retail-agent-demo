
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface StagingProduct {
  id: string;
  sku?: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  categoria?: string;
  cantidad_disponible?: number;
  imagen_url?: string;
  video_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated and is admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const isAdmin = roles?.some(r => r.role === 'admin')
    if (!isAdmin) {
      throw new Error('Access denied - admin role required')
    }

    const { productId } = await req.json()

    if (!productId) {
      throw new Error('Product ID is required')
    }

    // Fetch the staging product
    const { data: product, error: fetchError } = await supabaseClient
      .from('staging_products')
      .select('*')
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      throw new Error('Product not found')
    }

    // Validate the product
    const validation = validateProductData(product)
    
    // Update the product with validation results
    const { error: updateError } = await supabaseClient
      .from('staging_products')
      .update({
        validation_status: validation.isValid ? 'valid' : 'invalid',
        validation_errors: validation.errors.length > 0 ? validation.errors : null,
        validated_by: user.id,
        validated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (updateError) {
      throw updateError
    }

    // Log the validation action
    await supabaseClient
      .from('admin_audit_logs')
      .insert({
        user_id: user.id,
        action: 'VALIDATE_PRODUCT',
        resource_type: 'staging_products',
        resource_id: productId,
        details: {
          validation_result: validation,
          product_name: product.nombre,
        },
        success: true,
      })

    return new Response(
      JSON.stringify({
        success: true,
        validation,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error validating product:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function validateProductData(product: StagingProduct): ProductValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required field validation
  if (!product.nombre || product.nombre.trim().length === 0) {
    errors.push('Product name is required')
  }

  if (!product.descripcion || product.descripcion.trim().length === 0) {
    errors.push('Product description is required')
  }

  if (!product.categoria || product.categoria.trim().length === 0) {
    errors.push('Product category is required')
  }

  // Price validation
  if (product.precio === undefined || product.precio === null) {
    errors.push('Product price is required')
  } else if (product.precio < 0) {
    errors.push('Product price cannot be negative')
  } else if (product.precio === 0) {
    warnings.push('Product price is zero - please verify this is correct')
  }

  // Stock validation
  if (product.cantidad_disponible === undefined || product.cantidad_disponible === null) {
    errors.push('Stock quantity is required')
  } else if (product.cantidad_disponible < 0) {
    errors.push('Stock quantity cannot be negative')
  }

  // SKU validation
  if (product.sku && product.sku.length > 0) {
    // Basic SKU format validation
    if (!/^[A-Z0-9\-_]+$/i.test(product.sku)) {
      warnings.push('SKU should only contain letters, numbers, hyphens, and underscores')
    }
  } else {
    warnings.push('No SKU provided - consider adding one for better inventory tracking')
  }

  // Image URL validation
  if (product.imagen_url) {
    try {
      new URL(product.imagen_url)
    } catch {
      errors.push('Invalid image URL format')
    }
  } else {
    warnings.push('No product image provided')
  }

  // Video URL validation
  if (product.video_url) {
    try {
      new URL(product.video_url)
    } catch {
      errors.push('Invalid video URL format')
    }
  }

  // Business logic validation
  if (product.nombre && product.nombre.length > 200) {
    errors.push('Product name is too long (maximum 200 characters)')
  }

  if (product.descripcion && product.descripcion.length > 2000) {
    errors.push('Product description is too long (maximum 2000 characters)')
  }

  if (product.precio && product.precio > 999999.99) {
    warnings.push('Product price is very high - please verify this is correct')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
