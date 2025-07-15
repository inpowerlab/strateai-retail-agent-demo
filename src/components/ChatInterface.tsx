
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChat } from '@/hooks/useChat';
import { ProductFilters } from '@/types/database';

interface ChatInterfaceProps {
  onFiltersChange?: (filters: ProductFilters) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onFiltersChange }) => {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, isSending, startChat } = useChat(onFiltersChange);

  useEffect(() => {
    startChat();
  }, [startChat]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    try {
      // Send user message - AI response will be handled automatically by the hook
      sendMessage({ content: userMessage, sender: 'user' });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleStartConversation = () => {
    const welcomeMessage = "¡Hola! Soy tu asistente de compras de StrateAI. Puedo ayudarte a encontrar productos específicos basándome en nuestro inventario real. Por ejemplo, puedes preguntarme: 'Muéstrame televisores de 55 pulgadas bajo $800' o 'Busco audífonos inalámbricos'. ¿En qué puedo ayudarte hoy?";
    sendMessage({ content: welcomeMessage, sender: 'bot' });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">Asistente StrateAI</h2>
            <p className="text-xs text-muted-foreground">
              {messages.length === 0 ? 'Listo para ayudarte' : 'En línea • Integrado con OpenAI'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">¡Comencemos a chatear!</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Pregúntame sobre cualquier producto. Tengo acceso a todo nuestro inventario real y puedo ayudarte a encontrar exactamente lo que buscas.
            </p>
            <Button onClick={handleStartConversation} variant="outline">
              Iniciar conversación
            </Button>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ChatMessage message={message} />
                {index < messages.length - 1 && <Separator />}
              </React.Fragment>
            ))}
            {isSending && (
              <>
                <Separator />
                <div className="flex gap-3 p-4 bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Asistente StrateAI</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Analizando productos disponibles...
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background/95 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Pregúntame sobre productos disponibles..."
            disabled={isSending}
            className="flex-1"
            maxLength={500}
          />
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isSending}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Presiona Enter para enviar • Máximo 500 caracteres • Integrado con OpenAI
        </p>
      </div>
    </div>
  );
};
