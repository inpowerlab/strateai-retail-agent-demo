
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductRow {
  sku?: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  categoria?: string;
  cantidad_disponible?: number;
  imagen_url?: string;
  imagenes_urls?: string[];
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

    const { batchId } = await req.json()

    if (!batchId) {
      throw new Error('Batch ID is required')
    }

    // Get the file upload record
    const { data: fileUpload, error: fileError } = await supabaseClient
      .from('file_uploads')
      .select('*')
      .eq('batch_id', batchId)
      .single()

    if (fileError || !fileUpload) {
      throw new Error('File upload not found')
    }

    // Update file status to processing
    await supabaseClient
      .from('file_uploads')
      .update({ upload_status: 'processing' })
      .eq('id', fileUpload.id)

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('product-images')
      .download(fileUpload.storage_path)

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    // Process the file based on type
    let products: ProductRow[] = []
    
    if (fileUpload.file_type?.includes('spreadsheet') || 
        fileUpload.file_name.endsWith('.xlsx') || 
        fileUpload.file_name.endsWith('.xls')) {
      products = await processExcelFile(fileData)
    } else if (fileUpload.file_type?.includes('csv') || fileUpload.file_name.endsWith('.csv')) {
      products = await processCsvFile(fileData)
    } else {
      throw new Error('Unsupported file type. Please upload Excel (.xlsx, .xls) or CSV files.')
    }

    // Insert products into staging table
    const stagingProducts = products.map((product, index) => ({
      batch_id: batchId,
      ...product,
      validation_status: 'pending',
      imported_by: user.id,
      original_data: product,
      source_file_name: fileUpload.file_name,
      source_row_number: index + 2, // +2 because row 1 is header and arrays are 0-indexed
    }))

    const { error: insertError } = await supabaseClient
      .from('staging_products')
      .insert(stagingProducts)

    if (insertError) {
      throw new Error(`Failed to insert products: ${insertError.message}`)
    }

    // Update file status to completed
    await supabaseClient
      .from('file_uploads')
      .update({ 
        upload_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', fileUpload.id)

    // Log the import action
    await supabaseClient
      .from('admin_audit_logs')
      .insert({
        user_id: user.id,
        action: 'IMPORT_PRODUCTS',
        resource_type: 'staging_products',
        resource_id: batchId,
        details: {
          file_name: fileUpload.file_name,
          product_count: products.length,
          batch_id: batchId,
        },
        success: true,
      })

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: products.length,
        batchId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing inventory file:', error)
    
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

async function processExcelFile(fileData: Blob): Promise<ProductRow[]> {
  const arrayBuffer = await fileData.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
  
  // Get the first worksheet
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  
  if (jsonData.length < 2) {
    throw new Error('Excel file must contain at least a header row and one data row')
  }

  const headers = jsonData[0] as string[]
  const dataRows = jsonData.slice(1) as any[][]

  return dataRows.map(row => parseProductRow(headers, row))
}

async function processCsvFile(fileData: Blob): Promise<ProductRow[]> {
  const text = await fileData.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row')
  }

  const headers = parseCsvLine(lines[0])
  const dataRows = lines.slice(1).map(line => parseCsvLine(line))

  return dataRows.map(row => parseProductRow(headers, row))
}

function parseCsvLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

function parseProductRow(headers: string[], row: any[]): ProductRow {
  const product: ProductRow = {}
  
  headers.forEach((header, index) => {
    if (index >= row.length) return
    
    const value = row[index]
    if (value === null || value === undefined || value === '') return
    
    const normalizedHeader = header.toLowerCase().trim()
    
    // Map common header variations to our schema
    if (normalizedHeader.includes('sku') || normalizedHeader.includes('código')) {
      product.sku = String(value).trim()
    } else if (normalizedHeader.includes('name') || normalizedHeader.includes('nombre') || normalizedHeader.includes('título')) {
      product.nombre = String(value).trim()
    } else if (normalizedHeader.includes('description') || normalizedHeader.includes('descripción') || normalizedHeader.includes('desc')) {
      product.descripcion = String(value).trim()
    } else if (normalizedHeader.includes('price') || normalizedHeader.includes('precio') || normalizedHeader.includes('cost')) {
      const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
      if (!isNaN(numValue)) product.precio = numValue
    } else if (normalizedHeader.includes('category') || normalizedHeader.includes('categoría') || normalizedHeader.includes('tipo')) {
      product.categoria = String(value).trim()
    } else if (normalizedHeader.includes('stock') || normalizedHeader.includes('cantidad') || normalizedHeader.includes('inventory')) {
      const numValue = parseInt(String(value).replace(/[^0-9]/g, ''))
      if (!isNaN(numValue)) product.cantidad_disponible = numValue
    } else if (normalizedHeader.includes('image') || normalizedHeader.includes('imagen') || normalizedHeader.includes('photo')) {
      const urlValue = String(value).trim()
      if (urlValue.startsWith('http')) {
        product.imagen_url = urlValue
      }
    } else if (normalizedHeader.includes('video')) {
      const urlValue = String(value).trim()
      if (urlValue.startsWith('http')) {
        product.video_url = urlValue
      }
    }
  })
  
  return product
}
