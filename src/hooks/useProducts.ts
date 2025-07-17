
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Producto, ProductFilters } from '@/types/database';

export const useProducts = (filters?: ProductFilters) => {
  return useQuery({
    queryKey: ['productos', filters],
    queryFn: async (): Promise<Producto[]> => {
      console.log('🔍 Fetching products with filters:', filters);
      
      let query = supabase
        .from('productos')
        .select('*')
        .order('categoria')
        .order('nombre');

      if (filters?.categoria) {
        query = query.eq('categoria', filters.categoria);
      }

      if (filters?.precioMin !== undefined) {
        query = query.gte('precio', filters.precioMin);
      }

      if (filters?.precioMax !== undefined) {
        query = query.lte('precio', filters.precioMax);
      }

      if (filters?.searchTerm) {
        query = query.or(`nombre.ilike.%${filters.searchTerm}%,descripcion.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching products:', error);
        throw new Error('Failed to load products');
      }

      console.log('✅ Products loaded successfully:', data?.length || 0);
      return data || [];
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async (): Promise<string[]> => {
      console.log('🔍 Fetching categories...');
      
      const { data, error } = await supabase
        .from('productos')
        .select('categoria')
        .order('categoria');

      if (error) {
        console.error('❌ Error fetching categories:', error);
        throw new Error('Failed to load categories');
      }

      const uniqueCategories = Array.from(new Set(data?.map(item => item.categoria) || []));
      console.log('✅ Categories loaded successfully:', uniqueCategories);
      return uniqueCategories;
    },
    retry: 3,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
