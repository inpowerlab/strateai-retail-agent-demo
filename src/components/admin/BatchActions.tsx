
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Upload, Eye, AlertTriangle } from 'lucide-react';
import { useAdminInventory, StagingProduct } from '@/hooks/useAdminInventory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BatchActionsProps {
  selectedProducts: string[];
  stagingProducts: StagingProduct[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export const BatchActions: React.FC<BatchActionsProps> = ({
  selectedProducts,
  stagingProducts,
  onSelectionChange,
}) => {
  const { loading, approveProducts, publishProducts, validateProduct } = useAdminInventory();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const selectedProductsData = stagingProducts.filter(p => selectedProducts.includes(p.id));
  
  const stats = {
    total: selectedProducts.length,
    pending: selectedProductsData.filter(p => p.validation_status === 'pending').length,
    valid: selectedProductsData.filter(p => p.validation_status === 'valid').length,
    invalid: selectedProductsData.filter(p => p.validation_status === 'invalid').length,
    approved: selectedProductsData.filter(p => p.validation_status === 'approved').length,
    published: selectedProductsData.filter(p => p.validation_status === 'published').length,
  };

  const handleBatchValidation = async () => {
    setActionLoading('validate');
    try {
      const pendingProducts = selectedProductsData.filter(p => p.validation_status === 'pending');
      for (const product of pendingProducts) {
        await validateProduct(product.id);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchApproval = async () => {
    setActionLoading('approve');
    try {
      const validProducts = selectedProductsData
        .filter(p => p.validation_status === 'valid')
        .map(p => p.id);
      
      if (validProducts.length > 0) {
        await approveProducts(validProducts);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchPublish = async () => {
    setActionLoading('publish');
    try {
      const approvedProducts = selectedProductsData
        .filter(p => p.validation_status === 'approved')
        .map(p => p.id);
      
      if (approvedProducts.length > 0) {
        await publishProducts(approvedProducts);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const canValidate = stats.pending > 0;
  const canApprove = stats.valid > 0;
  const canPublish = stats.approved > 0;

  if (selectedProducts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Select products to perform batch actions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Batch Actions ({stats.total} selected)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Badge variant="secondary" className="justify-center">
            Pending: {stats.pending}
          </Badge>
          <Badge variant="default" className="justify-center">
            Valid: {stats.valid}
          </Badge>
          <Badge variant="destructive" className="justify-center">
            Invalid: {stats.invalid}
          </Badge>
          <Badge variant="outline" className="justify-center bg-green-50">
            Approved: {stats.approved}
          </Badge>
          <Badge variant="outline" className="justify-center bg-blue-50">
            Published: {stats.published}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleBatchValidation}
            disabled={!canValidate || loading || actionLoading === 'validate'}
            size="sm"
            variant="outline"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Validate ({stats.pending})
          </Button>

          <Button
            onClick={handleBatchApproval}
            disabled={!canApprove || loading || actionLoading === 'approve'}
            size="sm"
            variant="default"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve ({stats.valid})
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!canPublish || loading || actionLoading === 'publish'}
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Publish ({stats.approved})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Confirm Publication
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will publish {stats.approved} approved products to the live store.
                  This action cannot be undone. Are you sure you want to continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBatchPublish}>
                  Publish Products
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={() => onSelectionChange([])}
            size="sm"
            variant="ghost"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Clear Selection
          </Button>
        </div>

        {/* Warning Messages */}
        {stats.invalid > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              {stats.invalid} selected products have validation errors and need to be fixed before approval.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
