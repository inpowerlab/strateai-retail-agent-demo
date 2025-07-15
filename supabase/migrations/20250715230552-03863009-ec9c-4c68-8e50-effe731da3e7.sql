
-- Add video_url field to support product demo videos or promotional content
ALTER TABLE public.productos 
ADD COLUMN video_url TEXT;

-- Add imagenes_urls field to support multiple product images (array of text URLs)
ALTER TABLE public.productos 
ADD COLUMN imagenes_urls TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN public.productos.video_url IS 'Optional URL for product demo video or promotional content (YouTube, Vimeo, or direct video URL)';
COMMENT ON COLUMN public.productos.imagenes_urls IS 'Array of additional product image URLs. The main imagen_url field serves as the cover/primary image';

-- Update existing products to have empty arrays for imagenes_urls (backwards compatibility)
UPDATE public.productos 
SET imagenes_urls = '{}' 
WHERE imagenes_urls IS NULL;

-- Create index for better query performance on video_url
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_productos_video_url ON public.productos(video_url) 
WHERE video_url IS NOT NULL;
