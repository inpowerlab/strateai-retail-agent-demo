
import { Tables } from '@/integrations/supabase/types';

export type Producto = Tables<'productos'> & {
  video_url?: string | null;
  imagenes_urls?: string[] | null;
};

export type Conversacion = Tables<'conversaciones'>;
export type Mensaje = Tables<'mensajes'>;

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export interface ProductFilters {
  categoria?: string;
  precioMin?: number;
  precioMax?: number;
  searchTerm?: string;
}
