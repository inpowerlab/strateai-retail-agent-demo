
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, Conversacion, Mensaje, ProductFilters } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export const useChat = (onFiltersChange?: (filters: ProductFilters) => void) => {
  const [sessionId] = useState(() => uuidv4());
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Initialize conversation
  const initConversation = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from('conversaciones')
        .insert({ session_id: sessionId })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        throw new Error('Failed to start conversation');
      }

      return data.id;
    },
    onSuccess: (id) => {
      setConversacionId(id);
    },
  });

  // Get chat messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['mensajes', conversacionId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!conversacionId) return [];

      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('conversacion_id', conversacionId)
        .order('timestamp');

      if (error) {
        console.error('Error fetching messages:', error);
        throw new Error('Failed to load messages');
      }

      return data?.map(msg => ({
        id: msg.id,
        sender: msg.sender as 'user' | 'bot',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      })) || [];
    },
    enabled: !!conversacionId,
    refetchInterval: 1000, // Real-time updates
  });

  // Send message with AI integration
  const sendMessage = useMutation({
    mutationFn: async ({ content, sender }: { content: string; sender: 'user' | 'bot' }): Promise<void> => {
      let currentConversacionId = conversacionId;

      // Create conversation if not exists
      if (!currentConversacionId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversaciones')
          .insert({ session_id: sessionId })
          .select('id')
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          throw new Error('Failed to start conversation');
        }

        currentConversacionId = newConv.id;
        setConversacionId(currentConversacionId);
      }

      // Insert user message first
      const { error: userMessageError } = await supabase
        .from('mensajes')
        .insert({
          conversacion_id: currentConversacionId,
          sender,
          content,
        });

      if (userMessageError) {
        console.error('Error sending user message:', userMessageError);
        throw new Error('Failed to send message');
      }

      // If it's a user message, get AI response
      if (sender === 'user') {
        console.log('Calling chat assistant for user message:', content);
        
        const { data: aiResponse, error: aiError } = await supabase.functions.invoke('chat-assistant', {
          body: {
            message: content,
            conversationId: currentConversacionId,
          },
        });

        if (aiError) {
          console.error('Error calling chat assistant:', aiError);
          // Insert error message
          await supabase
            .from('mensajes')
            .insert({
              conversacion_id: currentConversacionId,
              sender: 'bot',
              content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
            });
          return;
        }

        console.log('AI response received:', aiResponse);

        // Apply filters if suggested
        if (aiResponse.filters && Object.keys(aiResponse.filters).length > 0) {
          console.log('Applying suggested filters:', aiResponse.filters);
          onFiltersChange?.(aiResponse.filters);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensajes', conversacionId] });
    },
  });

  const startChat = useCallback(() => {
    if (!conversacionId) {
      initConversation.mutate();
    }
  }, [conversacionId, initConversation]);

  return {
    messages,
    isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    startChat,
    sessionId,
  };
};
