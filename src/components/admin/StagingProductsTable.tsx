
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { StagingProduct, useAdminInventory } from '@/hooks/useAdminInventory';
import { ValidationStatusBadge } from './ValidationStatusBadge';
import { ProductDetailModal } from './ProductDetailModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StagingProductsTableProps {
  products: StagingProduct[];
  loading: boolean;
  selectedProducts: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onRefresh: () => void;
}

export const StagingProductsTable: React.FC<StagingProductsTableProps> = ({
  products,
  loading,
  selectedProducts,
  onSelectionChange,
  onRefresh,
}) => {
  const { validateProduct, updateStagingProduct } = useAdminInventory();
  const [selectedProduct, setSelectedProduct] = useState<StagingProduct | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || product.validation_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredProducts.map(p => p.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedProducts, productId]);
    } else {
      onSelectionChange(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleValidateProduct = async (productId: string) => {
    setActionLoading(`validate-${productId}`);
    try {
      await validateProduct(productId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveProduct = async (productId: string) => {
    setActionLoading(`approve-${productId}`);
    try {
      await updateStagingProduct(productId, { 
        validation_status: 'approved',
        approved_at: new Date().toISOString(),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectProduct = async (productId: string) => {
    setActionLoading(`reject-${productId}`);
    try {
      await updateStagingProduct(productId, { 
        validation_status: 'rejected',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const isAllSelected = filteredProducts.length > 0 && 
    filteredProducts.every(p => selectedProducts.includes(p.id));
  const isSomeSelected = selectedProducts.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading staging products...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staging Products</CardTitle>
              <CardDescription>
                Review, validate, and manage product data before publication
              </CardDescription>
            </div>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {products.length === 0 
                  ? 'No staging products found. Upload a file to get started.'
                  : 'No products match your current filters.'
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        indeterminate={isSomeSelected && !isAllSelected}
                      />
                    </TableHead>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Imported</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => 
                            handleSelectProduct(product.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {product.imagen_url ? (
                          <img
                            src={product.imagen_url}
                            alt={product.nombre || 'Product'}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.nombre || 'Unnamed Product'}</p>
                          {product.sku && (
                            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.categoria || 'Uncategorized'}</Badge>
                      </TableCell>
                      <TableCell>
                        {product.precio ? `$${product.precio.toFixed(2)}` : 'No price'}
                      </TableCell>
                      <TableCell>
                        {product.cantidad_disponible ?? 'No stock info'}
                      </TableCell>
                      <TableCell>
                        <ValidationStatusBadge status={product.validation_status} />
                        {product.validation_errors && Array.isArray(product.validation_errors) && 
                         product.validation_errors.length > 0 && (
                          <div className="mt-1">
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {product.validation_errors.length} errors
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(product.imported_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {product.validation_status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleValidateProduct(product.id)}
                              disabled={actionLoading === `validate-${product.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {product.validation_status === 'valid' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApproveProduct(product.id)}
                                disabled={actionLoading === `approve-${product.id}`}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectProduct(product.id)}
                                disabled={actionLoading === `reject-${product.id}`}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={(updates) => {
            updateStagingProduct(selectedProduct.id, updates);
            setSelectedProduct(null);
          }}
        />
      )}
    </>
  );
};
