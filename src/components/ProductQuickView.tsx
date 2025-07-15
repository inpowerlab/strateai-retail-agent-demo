
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Producto } from '@/types/database';

interface ProductQuickViewProps {
  product: Producto | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setCurrentImageIndex(0);
      setIsVideoPlaying(false);
      setVideoError(false);
    }
  }, [product]);

  if (!product) return null;

  // Combine main image with additional images
  const allImages = [
    product.imagen_url,
    ...(product.imagenes_urls || [])
  ].filter(Boolean);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.includes('youtu.be') 
      ? url.split('youtu.be/')[1]?.split('?')[0]
      : url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1` : null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogClose className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background/80 backdrop-blur-sm">
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="flex flex-col lg:flex-row">
          {/* Media Section */}
          <div className="flex-1 bg-muted/20">
            {/* Image Carousel */}
            <div className="relative aspect-square lg:aspect-[4/3]">
              {allImages.length > 0 ? (
                <>
                  <img
                    src={allImages[currentImageIndex]}
                    alt={product.nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop';
                    }}
                  />
                  
                  {/* Navigation Arrows */}
                  {allImages.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* Image Indicators */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {allImages.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground">No image available</span>
                </div>
              )}
            </div>

            {/* Video Section */}
            {product.video_url && !videoError && (
              <div className="aspect-video bg-black">
                {isYouTubeUrl(product.video_url) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(product.video_url) || ''}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onError={handleVideoError}
                  />
                ) : (
                  <video
                    className="w-full h-full"
                    controls
                    muted
                    onError={handleVideoError}
                  >
                    <source src={product.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-2xl lg:text-3xl font-bold leading-tight">
                    {product.nombre}
                  </h2>
                  <Badge variant="secondary" className="shrink-0">
                    {product.categoria}
                  </Badge>
                </div>
                
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                  {formatPrice(Number(product.precio))}
                </div>

                <Badge 
                  variant={product.cantidad_disponible > 10 ? "default" : product.cantidad_disponible > 0 ? "secondary" : "destructive"}
                  className="text-sm"
                >
                  {product.cantidad_disponible > 0 
                    ? `${product.cantidad_disponible} disponibles` 
                    : 'Agotado'
                  }
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Descripción</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.descripcion}
                </p>
              </div>

              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Categoría</span>
                  <p className="font-medium">{product.categoria}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Disponibilidad</span>
                  <p className="font-medium">
                    {product.cantidad_disponible > 0 ? 'En stock' : 'Agotado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
