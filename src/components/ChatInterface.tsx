import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, MessageSquare, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChat } from '@/hooks/useChat';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { ProductFilters } from '@/types/database';

interface ChatInterfaceProps {
  onFiltersChange?: (filters: ProductFilters) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onFiltersChange }) => {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastBotMessageIdRef = useRef<string | null>(null);
  const { messages, sendMessage, isSending, startChat } = useChat(onFiltersChange);
  
  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechSupported,
    isInitializing: speechInitializing
  } = useSpeechToText();

  const {
    isSpeaking,
    error: ttsError,
    speak,
    stop: stopSpeaking,
    isSupported: ttsSupported,
    isMuted,
    toggleMute,
    isInitializing: ttsInitializing
  } = useTextToSpeech();

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

  // Handle voice transcript with auto-send
  useEffect(() => {
    if (transcript && transcript.length > 3) {
      console.log('Processing transcript:', transcript);
      setInputValue(transcript);
      resetTranscript();
      
      // Auto-send the transcribed message after a short delay
      setTimeout(() => {
        if (transcript.trim()) {
          sendMessage({ content: transcript.trim(), sender: 'user' });
          setInputValue('');
        }
      }, 500);
    }
  }, [transcript, resetTranscript, sendMessage]);

  // Enhanced TTS auto-speak with message ID-based triggering
  useEffect(() => {
    if (messages.length === 0 || isSending) return;

    const lastMessage = messages[messages.length - 1];
    
    // Only process bot messages that haven't been spoken yet
    if (lastMessage && 
        lastMessage.sender === 'bot' && 
        lastMessage.id !== lastBotMessageIdRef.current &&
        ttsSupported && 
        !isMuted && 
        lastMessage.content.length > 0) {
      
      console.log('New bot message detected for TTS:', lastMessage.id, lastMessage.content.substring(0, 50));
      
      // Update the last spoken message reference
      lastBotMessageIdRef.current = lastMessage.id;
      
      // Delay to ensure message is fully rendered and previous speech stopped
      setTimeout(() => {
        speak(lastMessage.content, lastMessage.id);
      }, 800);
    }
  }, [messages, speak, ttsSupported, isMuted, isSending]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    try {
      sendMessage({ content: userMessage, sender: 'user' });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening || speechInitializing) {
      stopListening();
    } else {
      // Stop TTS when starting to listen
      if (isSpeaking) {
        stopSpeaking();
      }
      startListening();
    }
  };

  const handleStartConversation = () => {
    const welcomeMessage = "¡Hola! Soy tu asistente de compras de StrateAI. Puedo ayudarte a encontrar productos específicos basándome en nuestro inventario real. Por ejemplo, puedes preguntarme: Muéstrame televisores de 55 pulgadas bajo 800 dólares o Busco audífonos inalámbricos. ¿En qué puedo ayudarte hoy?";
    sendMessage({ content: welcomeMessage, sender: 'bot' });
  };

  const voiceButtonVariant = (isListening || speechInitializing) ? "destructive" : "outline";
  const voiceButtonClass = (isListening || speechInitializing) ? 
    "bg-red-100 text-red-600 border-red-300 animate-pulse" : "";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">Asistente StrateAI</h2>
            <p className="text-xs text-muted-foreground">
              {messages.length === 0 
                ? 'Listo para ayudarte' 
                : `En línea • ${speechSupported ? 'Voz disponible' : 'Solo texto'} • Integrado con OpenAI`}
            </p>
          </div>
          {/* Voice Controls */}
          <div className="flex items-center gap-2">
            {ttsSupported && (
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleMute}
                className="h-8 w-8 p-0"
                title={isMuted ? 'Activar voz' : 'Silenciar voz'}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}
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
              {speechSupported && ' También puedes usar tu voz para hablar conmigo.'}
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

      {/* Voice/TTS Status and Error Messages */}
      {(speechError || ttsError || isListening || speechInitializing || isSpeaking || ttsInitializing) && (
        <div className="px-4 py-2 bg-muted border-t">
          {isListening && (
            <p className="text-xs text-blue-700 animate-pulse">
              🎤 Escuchando... Habla ahora
            </p>
          )}
          {speechInitializing && (
            <p className="text-xs text-blue-700">
              🎤 Iniciando micrófono...
            </p>
          )}
          {(isSpeaking || ttsInitializing) && (
            <p className="text-xs text-green-700">
              🔊 Reproduciendo respuesta...
            </p>
          )}
          {(speechError || ttsError) && (
            <p className="text-xs text-red-700">
              ❌ {speechError || ttsError}
            </p>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-background/95 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={speechSupported ? "Escribe o usa el micrófono..." : "Pregúntame sobre productos disponibles..."}
            disabled={isSending || isListening || speechInitializing}
            className="flex-1"
            maxLength={500}
          />
          {speechSupported && (
            <Button
              type="button"
              onClick={handleVoiceToggle}
              disabled={isSending}
              size="icon"
              variant={voiceButtonVariant}
              className={`transition-colors ${voiceButtonClass}`}
              title={
                isListening || speechInitializing 
                  ? 'Parar grabación' 
                  : 'Iniciar grabación de voz'
              }
            >
              {(isListening || speechInitializing) ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isSending || isListening || speechInitializing}
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
          Presiona Enter para enviar • Máximo 500 caracteres • 
          {speechSupported ? ' Voz disponible' : ' Solo texto'} • 
          Integrado con OpenAI
        </p>
      </div>
    </div>
  );
};
