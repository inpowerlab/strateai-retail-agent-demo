
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { StagingProduct } from '@/hooks/useAdminInventory';

interface ProductValidationDetailsProps {
  product: StagingProduct;
}

export const ProductValidationDetails: React.FC<ProductValidationDetailsProps> = ({ product }) => {
  const validationErrors = Array.isArray(product.validation_errors) ? product.validation_errors : [];
  
  const hasErrors = validationErrors.length > 0;
  const isValid = product.validation_status === 'valid';
  const isPending = product.validation_status === 'pending';

  if (isPending) {
    return (
      <Card className="border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-orange-500" />
            Validation Pending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This product has not been validated yet. Click "Validate" to check for errors.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isValid && !hasErrors) {
    return (
      <Card className="border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Validation Passed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">
            All validation checks passed. This product is ready for approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (hasErrors) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Validation Errors ({validationErrors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {validationErrors.map((error, index) => (
            <div key={index} className="flex items-start gap-2">
              <Badge variant="destructive" className="text-xs">
                Error {index + 1}
              </Badge>
              <p className="text-sm text-red-700 flex-1">{error}</p>
            </div>
          ))}
          <div className="mt-4 p-3 bg-red-50 rounded-md">
            <p className="text-xs text-red-600">
              Fix these validation errors before the product can be approved and published.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
