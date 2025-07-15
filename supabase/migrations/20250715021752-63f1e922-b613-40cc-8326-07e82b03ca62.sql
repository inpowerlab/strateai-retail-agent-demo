
-- Create productos table with all required fields
CREATE TABLE public.productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  categoria TEXT NOT NULL,
  imagen_url TEXT NOT NULL,
  cantidad_disponible INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversaciones table for chat sessions
CREATE TABLE public.conversaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mensajes table for chat messages
CREATE TABLE public.mensajes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversacion_id UUID REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert real consumer electronics products (minimum 10 products, 3+ categories)
INSERT INTO public.productos (nombre, descripcion, precio, categoria, imagen_url, cantidad_disponible) VALUES
-- Televisores
('Samsung 55" QLED 4K TV', 'Televisor QLED de 55 pulgadas con resolución 4K, HDR10+ y Tizen OS. Incluye control remoto inteligente y conectividad WiFi.', 799.99, 'Televisores', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&h=500&fit=crop', 25),
('LG 65" OLED Smart TV', 'Televisor OLED de 65 pulgadas con tecnología AI ThinQ, Dolby Vision y webOS. Pantalla autoiluminada para negros perfectos.', 1299.99, 'Televisores', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&h=500&fit=crop', 15),
('Sony 43" LED Full HD', 'Televisor LED de 43 pulgadas Full HD con Android TV, Google Assistant integrado y múltiples puertos HDMI.', 449.99, 'Televisores', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&h=500&fit=crop', 30),

-- Smartphones
('iPhone 15 Pro 128GB', 'Smartphone Apple con chip A17 Pro, cámara de 48MP, pantalla Super Retina XDR de 6.1 pulgadas y 5G.', 999.99, 'Smartphones', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop', 50),
('Samsung Galaxy S24 256GB', 'Smartphone Android con procesador Snapdragon 8 Gen 3, cámara triple de 50MP y pantalla Dynamic AMOLED de 6.2 pulgadas.', 849.99, 'Smartphones', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop', 40),
('Google Pixel 8 Pro 512GB', 'Smartphone con cámara computacional avanzada, chip Tensor G3, pantalla LTPO OLED de 6.7 pulgadas y Android puro.', 1099.99, 'Smartphones', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop', 20),

-- Laptops
('MacBook Air M3 13"', 'Laptop ultradelgada con chip M3, 8GB RAM, 256GB SSD, pantalla Liquid Retina de 13.6 pulgadas y hasta 18 horas de batería.', 1199.99, 'Laptops', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop', 35),
('Dell XPS 15 OLED', 'Laptop premium con Intel Core i7, 16GB RAM, 512GB SSD, pantalla OLED 4K de 15.6 pulgadas y tarjeta gráfica RTX 4060.', 1899.99, 'Laptops', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop', 18),
('HP Pavilion Gaming', 'Laptop gaming con AMD Ryzen 7, 16GB RAM, 1TB SSD, pantalla IPS de 15.6 pulgadas y tarjeta gráfica RTX 4050.', 899.99, 'Laptops', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop', 22),

-- Audio
('Sony WH-1000XM5', 'Audífonos inalámbricos con cancelación de ruido líder en la industria, 30 horas de batería y sonido Hi-Res.', 399.99, 'Audio', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop', 60),
('Apple AirPods Pro 2', 'Audífonos in-ear con cancelación activa de ruido, audio espacial personalizado y estuche MagSafe.', 249.99, 'Audio', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop', 75),
('JBL Charge 5', 'Altavoz Bluetooth portátil resistente al agua con 20 horas de reproducción y función de carga para dispositivos.', 179.99, 'Audio', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop', 45);

-- Create indexes for better performance
CREATE INDEX idx_productos_categoria ON public.productos(categoria);
CREATE INDEX idx_productos_precio ON public.productos(precio);
CREATE INDEX idx_conversaciones_session_id ON public.conversaciones(session_id);
CREATE INDEX idx_mensajes_conversacion_id ON public.mensajes(conversacion_id);
CREATE INDEX idx_mensajes_timestamp ON public.mensajes(timestamp);

-- Enable Row Level Security (though not needed for demo mode, good practice)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (demo mode)
CREATE POLICY "Allow public read access to productos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Allow public read access to conversaciones" ON public.conversaciones FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to conversaciones" ON public.conversaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to mensajes" ON public.mensajes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to mensajes" ON public.mensajes FOR INSERT WITH CHECK (true);
