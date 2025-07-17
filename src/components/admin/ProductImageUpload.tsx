
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useAdminInventory } from '@/hooks/useAdminInventory';
import { useToast } from '@/hooks/use-toast';

interface ProductImageUploadProps {
  productId: string;
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  productId,
  currentImageUrl,
  onImageUploaded,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { uploadProductImage } = useAdminInventory();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: 'Error',
        description: 'Image file size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const imageUrl = await uploadProductImage(productId, file);
      onImageUploaded(imageUrl);
      toast({
        title: 'Success',
        description: 'Product image uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, [productId, uploadProductImage, onImageUploaded, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: false,
    disabled: uploading,
  });

  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div className="space-y-4">
      {displayUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={displayUrl}
                alt="Product preview"
                className="w-full h-48 object-cover rounded-md"
              />
              {!uploading && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPreviewUrl(null);
                    onImageUploaded('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                  <div className="text-white text-sm">Uploading...</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card
        {...getRootProps()}
        className={`cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-dashed'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <CardContent className="p-6">
          <input {...getInputProps()} />
          <div className="text-center space-y-2">
            {isDragActive ? (
              <>
                <Upload className="h-8 w-8 mx-auto text-primary" />
                <p className="text-sm text-primary">Drop the image here...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop an image here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPEG, PNG, WebP, GIF (max 5MB)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
