
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Producto } from '@/types/database';

interface ProductCardProps {
  product: Producto;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Card 
      className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="aspect-square relative overflow-hidden">
        <img
          src={product.imagen_url}
          alt={product.nombre}
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=500&h=500&fit=crop';
          }}
        />
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            {product.categoria}
          </Badge>
        </div>
        {/* Video indicator */}
        {product.video_url && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="default" className="bg-primary/90 backdrop-blur-sm text-xs">
              Video
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
            {product.nombre}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-3 mb-4 min-h-[4.5rem]">
            {product.descripcion}
          </p>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(Number(product.precio))}
          </span>
          <Badge variant={product.cantidad_disponible > 10 ? "default" : "destructive"}>
            {product.cantidad_disponible > 0 ? `${product.cantidad_disponible} disponibles` : 'Agotado'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
