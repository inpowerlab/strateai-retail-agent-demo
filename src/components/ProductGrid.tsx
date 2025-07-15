
import React, { useState } from 'react';
import { ProductCard } from './ProductCard';
import { ProductQuickView } from './ProductQuickView';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package } from 'lucide-react';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { ProductFilters, Producto } from '@/types/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ProductGridProps {
  filters?: ProductFilters;
  onFiltersChange?: (filters: ProductFilters) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ filters, onFiltersChange }) => {
  const { data: products, isLoading, error } = useProducts(filters);
  const { data: categories } = useCategories();
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const handleCategoryChange = (categoria: string) => {
    onFiltersChange?.({
      ...filters,
      categoria: categoria === 'all' ? undefined : categoria,
    });
  };

  const clearFilters = () => {
    onFiltersChange?.({});
  };

  const handleProductClick = (product: Producto) => {
    setSelectedProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false);
    setSelectedProduct(null);
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los productos. Por favor, intenta de nuevo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters Header - Fixed at top */}
      <div className="p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <h2 className="text-xl font-semibold">Productos</h2>
            {products && (
              <span className="text-sm text-muted-foreground">
                {products.length} productos encontrados
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Select
              value={filters?.categoria || 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories?.map((categoria) => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filters?.categoria || filters?.searchTerm) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid - Fully Scrollable Container */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </div>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No se encontraron productos</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Intenta ajustar los filtros de búsqueda o usa el chat para encontrar productos específicos
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Ver todos los productos
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Product Quick View Modal */}
      <ProductQuickView
        product={selectedProduct}
        isOpen={isQuickViewOpen}
        onClose={handleCloseQuickView}
      />
    </div>
  );
};
