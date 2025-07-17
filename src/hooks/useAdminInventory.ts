
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StagingProduct {
  id: string;
  batch_id: string;
  sku?: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  categoria?: string;
  cantidad_disponible?: number;
  imagen_url?: string;
  imagenes_urls?: string[];
  video_url?: string;
  validation_errors?: any;
  validation_status: 'pending' | 'valid' | 'invalid' | 'approved' | 'rejected' | 'published';
  imported_by?: string;
  imported_at: string;
  validated_by?: string;
  validated_at?: string;
  approved_by?: string;
  approved_at?: string;
  published_at?: string;
  original_data?: any;
  source_file_name?: string;
  source_row_number?: number;
}

export interface FileUpload {
  id: string;
  batch_id: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  storage_path?: string;
  upload_status: 'uploading' | 'completed' | 'failed' | 'processing';
  uploaded_by?: string;
  uploaded_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export const useAdminInventory = () => {
  const [loading, setLoading] = useState(false);
  const [stagingProducts, setStagingProducts] = useState<StagingProduct[]>([]);
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const { toast } = useToast();

  const fetchStagingProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staging_products')
        .select('*')
        .order('imported_at', { ascending: false });

      if (error) throw error;
      setStagingProducts(data || []);
    } catch (error) {
      console.error('Error fetching staging products:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch staging products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchFileUploads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFileUploads(data || []);
    } catch (error) {
      console.error('Error fetching file uploads:', error);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const batchId = crypto.randomUUID();
    const fileExt = file.name.split('.').pop();
    const fileName = `${batchId}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Record file upload
    const { error: dbError } = await supabase
      .from('file_uploads')
      .insert({
        batch_id: batchId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath,
        upload_status: 'completed',
      });

    if (dbError) throw dbError;

    return batchId;
  }, []);

  const processInventoryFile = useCallback(async (batchId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-inventory-file', {
        body: { batchId },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Processed ${data.processedCount} products`,
      });

      await fetchStagingProducts();
      await fetchFileUploads();
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Error',
        description: 'Failed to process inventory file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchStagingProducts, fetchFileUploads]);

  const updateStagingProduct = useCallback(async (productId: string, updates: Partial<StagingProduct>) => {
    try {
      const { error } = await supabase
        .from('staging_products')
        .update(updates)
        .eq('id', productId);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        action: 'UPDATE_STAGING_PRODUCT',
        resource_type: 'staging_products',
        resource_id: productId,
        details: updates,
        success: true,
      });

      await fetchStagingProducts();
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      });
    }
  }, [toast, fetchStagingProducts]);

  const validateProduct = useCallback(async (productId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-product', {
        body: { productId },
      });

      if (error) throw error;

      await fetchStagingProducts();
      toast({
        title: 'Success',
        description: 'Product validated successfully',
      });
    } catch (error) {
      console.error('Error validating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate product',
        variant: 'destructive',
      });
    }
  }, [toast, fetchStagingProducts]);

  const approveProducts = useCallback(async (productIds: string[]) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('staging_products')
        .update({ 
          validation_status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .in('id', productIds);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        action: 'APPROVE_PRODUCTS',
        resource_type: 'staging_products',
        resource_id: productIds.join(','),
        details: { productCount: productIds.length },
        success: true,
      });

      await fetchStagingProducts();
      toast({
        title: 'Success',
        description: `Approved ${productIds.length} products`,
      });
    } catch (error) {
      console.error('Error approving products:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchStagingProducts]);

  const publishProducts = useCallback(async (productIds: string[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('publish_staging_products', {
        staging_ids: productIds,
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.error_message || 'Unknown error occurred');
      }

      await fetchStagingProducts();
      toast({
        title: 'Success',
        description: `Published ${result.published_count} products`,
      });
    } catch (error) {
      console.error('Error publishing products:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchStagingProducts]);

  const uploadProductImage = useCallback(async (productId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `products/${productId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    // Update product with new image URL
    await updateStagingProduct(productId, { imagen_url: publicUrl });

    return publicUrl;
  }, [updateStagingProduct]);

  return {
    loading,
    stagingProducts,
    fileUploads,
    auditLogs,
    fetchStagingProducts,
    fetchFileUploads,
    fetchAuditLogs,
    uploadFile,
    processInventoryFile,
    updateStagingProduct,
    validateProduct,
    approveProducts,
    publishProducts,
    uploadProductImage,
  };
};
