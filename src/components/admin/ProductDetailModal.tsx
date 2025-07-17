
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X } from 'lucide-react';
import { StagingProduct } from '@/hooks/useAdminInventory';
import { ValidationStatusBadge } from './ValidationStatusBadge';
import { ProductValidationDetails } from './ProductValidationDetails';
import { ProductImageUpload } from './ProductImageUpload';

interface ProductDetailModalProps {
  product: StagingProduct;
  open: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<StagingProduct>) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  open,
  onClose,
  onUpdate,
}) => {
  const [editedProduct, setEditedProduct] = useState<StagingProduct>(product);
  const [hasChanges, setHasChanges] = useState(false);

  const handleFieldChange = (field: keyof StagingProduct, value: string | number | string[] | null) => {
    setEditedProduct(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const updates: Partial<StagingProduct> = {};
    
    // Only include changed fields
    (Object.keys(editedProduct) as Array<keyof StagingProduct>).forEach(key => {
      if (editedProduct[key] !== product[key]) {
        (updates as any)[key] = editedProduct[key];
      }
    });

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
    onClose();
  };

  const handleCancel = () => {
    setEditedProduct(product);
    setHasChanges(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Product Details
            <ValidationStatusBadge status={product.validation_status} />
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Product Details</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Product Name *</Label>
                    <Input
                      id="nombre"
                      value={editedProduct.nombre || ''}
                      onChange={(e) => handleFieldChange('nombre', e.target.value)}
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={editedProduct.sku || ''}
                      onChange={(e) => handleFieldChange('sku', e.target.value)}
                      placeholder="Enter product SKU"
                    />
                  </div>

                  <div>
                    <Label htmlFor="categoria">Category *</Label>
                    <Input
                      id="categoria"
                      value={editedProduct.categoria || ''}
                      onChange={(e) => handleFieldChange('categoria', e.target.value)}
                      placeholder="Enter product category"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="precio">Price *</Label>
                      <Input
                        id="precio"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedProduct.precio || ''}
                        onChange={(e) => handleFieldChange('precio', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cantidad_disponible">Stock *</Label>
                      <Input
                        id="cantidad_disponible"
                        type="number"
                        min="0"
                        value={editedProduct.cantidad_disponible || ''}
                        onChange={(e) => handleFieldChange('cantidad_disponible', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="descripcion">Description *</Label>
                    <Textarea
                      id="descripcion"
                      value={editedProduct.descripcion || ''}
                      onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                      placeholder="Enter product description"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="imagen_url">Image URL</Label>
                    <Input
                      id="imagen_url"
                      value={editedProduct.imagen_url || ''}
                      onChange={(e) => handleFieldChange('imagen_url', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="video_url">Video URL</Label>
                    <Input
                      id="video_url"
                      value={editedProduct.video_url || ''}
                      onChange={(e) => handleFieldChange('video_url', e.target.value)}
                      placeholder="https://example.com/video.mp4"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="validation">
              <ProductValidationDetails product={product} />
            </TabsContent>

            <TabsContent value="images">
              <ProductImageUpload
                productId={product.id}
                currentImageUrl={editedProduct.imagen_url}
                onImageUploaded={(imageUrl) => handleFieldChange('imagen_url', imageUrl)}
              />
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Import Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Batch ID:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {product.batch_id}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Source File:</span>
                      <span className="text-sm">{product.source_file_name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Row Number:</span>
                      <span className="text-sm">{product.source_row_number || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Imported:</span>
                      <span className="text-sm">
                        {new Date(product.imported_at).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Processing Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <ValidationStatusBadge status={product.validation_status} />
                    </div>
                    {product.validated_at && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Validated:</span>
                        <span className="text-sm">
                          {new Date(product.validated_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {product.approved_at && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Approved:</span>
                        <span className="text-sm">
                          {new Date(product.approved_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {product.published_at && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Published:</span>
                        <span className="text-sm">
                          {new Date(product.published_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {product.original_data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Original Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                      {JSON.stringify(product.original_data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
