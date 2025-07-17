
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage, Conversacion, Mensaje, ProductFilters } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export const useChat = (onFiltersChange?: (filters: ProductFilters) => void) => {
  const { user } = useAuth();
  const [sessionId] = useState(() => uuidv4());
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Audit logging function
  const logAuditEvent = useCallback(async (action: string, resourceType: string, resourceId: string, details?: any) => {
    if (!user) return;
    
    try {
      await supabase.functions.invoke('audit-logger', {
        body: {
          user_id: user.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }, [user]);

  // Initialize conversation with proper user authentication
  const initConversation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!user) {
        throw new Error('User must be authenticated to start conversation');
      }

      const { data, error } = await supabase
        .from('conversaciones')
        .insert({ 
          session_id: sessionId,
          user_id: user.id 
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        await logAuditEvent('create_failed', 'conversation', sessionId, { error: error.message });
        throw new Error('Failed to start conversation');
      }

      await logAuditEvent('create', 'conversation', data.id, { session_id: sessionId });
      return data.id;
    },
    onSuccess: (id) => {
      setConversacionId(id);
    },
  });

  // Get chat messages with authentication
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['mensajes', conversacionId, user?.id],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!conversacionId || !user) return [];

      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('conversacion_id', conversacionId)
        .order('timestamp');

      if (error) {
        console.error('Error fetching messages:', error);
        await logAuditEvent('read_failed', 'messages', conversacionId, { error: error.message });
        throw new Error('Failed to load messages');
      }

      await logAuditEvent('read', 'messages', conversacionId, { count: data?.length || 0 });

      return data?.map(msg => ({
        id: msg.id,
        sender: msg.sender as 'user' | 'bot',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      })) || [];
    },
    enabled: !!conversacionId && !!user,
    refetchInterval: 1000, // Real-time updates
  });

  // Send message with AI integration and audit logging
  const sendMessage = useMutation({
    mutationFn: async ({ content, sender }: { content: string; sender: 'user' | 'bot' }): Promise<void> => {
      if (!user) {
        throw new Error('User must be authenticated to send messages');
      }

      // Validate message content
      if (!content?.trim()) {
        throw new Error('Message content cannot be empty');
      }

      if (content.length > 4000) {
        throw new Error('Message content too long (max 4000 characters)');
      }

      let currentConversacionId = conversacionId;

      // Create conversation if not exists
      if (!currentConversacionId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversaciones')
          .insert({ 
            session_id: sessionId,
            user_id: user.id
          })
          .select('id')
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          await logAuditEvent('create_failed', 'conversation', sessionId, { error: convError.message });
          throw new Error('Failed to start conversation');
        }

        currentConversacionId = newConv.id;
        setConversacionId(currentConversacionId);
        await logAuditEvent('create', 'conversation', currentConversacionId, { session_id: sessionId });
      }

      // Insert user message with validation
      const messageData = {
        conversacion_id: currentConversacionId,
        sender,
        content: content.trim(),
        user_id: user.id,
        timestamp: new Date().toISOString(),
      };

      const { data: messageResult, error: userMessageError } = await supabase
        .from('mensajes')
        .insert(messageData)
        .select('id')
        .single();

      if (userMessageError) {
        console.error('Error sending user message:', userMessageError);
        await logAuditEvent('create_failed', 'message', currentConversacionId, { 
          error: userMessageError.message,
          sender,
          content: content.substring(0, 100)
        });
        throw new Error('Failed to send message');
      }

      await logAuditEvent('create', 'message', messageResult.id, { 
        sender, 
        conversation_id: currentConversacionId,
        content_length: content.length 
      });

      // If it's a user message, get AI response
      if (sender === 'user') {
        console.log('Calling chat assistant for user message:', content);
        
        try {
          const { data: aiResponse, error: aiError } = await supabase.functions.invoke('chat-assistant', {
            body: {
              message: content,
              conversationId: currentConversacionId,
              userId: user.id,
            },
          });

          if (aiError) {
            console.error('Error calling chat assistant:', aiError);
            await logAuditEvent('ai_request_failed', 'chat_assistant', currentConversacionId, { 
              error: aiError.message,
              user_message: content.substring(0, 100)
            });
            
            // Insert error message
            await supabase
              .from('mensajes')
              .insert({
                conversacion_id: currentConversacionId,
                sender: 'bot',
                content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
                user_id: user.id,
              });
            return;
          }

          console.log('AI response received:', aiResponse);
          await logAuditEvent('ai_request_success', 'chat_assistant', currentConversacionId, { 
            response_length: aiResponse?.response?.length || 0,
            filters_applied: !!aiResponse?.filters
          });

          // Apply filters if suggested
          if (aiResponse.filters && Object.keys(aiResponse.filters).length > 0) {
            console.log('Applying suggested filters:', aiResponse.filters);
            await logAuditEvent('filter_applied', 'product_search', currentConversacionId, aiResponse.filters);
            onFiltersChange?.(aiResponse.filters);
          }
        } catch (error) {
          console.error('Unexpected error in AI processing:', error);
          await logAuditEvent('ai_request_error', 'chat_assistant', currentConversacionId, { 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensajes', conversacionId] });
    },
  });

  const startChat = useCallback(() => {
    if (!conversacionId && user) {
      initConversation.mutate();
    }
  }, [conversacionId, user, initConversation]);

  return {
    messages,
    isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    startChat,
    sessionId,
    user,
  };
};
