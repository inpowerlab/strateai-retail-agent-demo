
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAdminInventory } from '@/hooks/useAdminInventory';
import { useToast } from '@/hooks/use-toast';

interface FileUploadSectionProps {
  onUploadComplete?: () => void;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({ onUploadComplete }) => {
  const { uploadFile, processInventoryFile } = useAdminInventory();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; batchId: string; processed: boolean }>>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    
    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        const batchId = await uploadFile(file);
        return { name: file.name, batchId, processed: false };
      });
      
      const results = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...results]);
      
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${acceptedFiles.length} file(s)`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload one or more files',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [uploadFile, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const handleProcessFile = async (batchId: string, fileName: string) => {
    setProcessing(true);
    try {
      await processInventoryFile(batchId);
      setUploadedFiles(prev => 
        prev.map(file => 
          file.batchId === batchId ? { ...file, processed: true } : file
        )
      );
      onUploadComplete?.();
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const clearProcessedFiles = () => {
    setUploadedFiles(prev => prev.filter(file => !file.processed));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Inventory Files
          </CardTitle>
          <CardDescription>
            Upload Excel (.xlsx, .xls), CSV, or PDF files containing product inventory data.
            Files will be processed and added to the staging area for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${uploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <Upload className={`h-10 w-10 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              {uploading ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploading files...</p>
                  <Progress value={undefined} className="w-48" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports: .xlsx, .xls, .csv, .pdf (Max 10MB per file)
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Files ({uploadedFiles.length})
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearProcessedFiles}
                disabled={!uploadedFiles.some(f => f.processed)}
              >
                Clear Processed
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                    {file.processed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                  
                  {!file.processed && (
                    <Button
                      size="sm"
                      onClick={() => handleProcessFile(file.batchId, file.name)}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : 'Process'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
