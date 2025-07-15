
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageSquare, Send, Loader2, Mic, MicOff, Play } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { VoiceIndicator } from './VoiceIndicator';
import { useChat } from '@/hooks/useChat';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { ProductFilters } from '@/types/database';

interface MobileChatButtonProps {
  onFiltersChange?: (filters: ProductFilters) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Safe fallback for findLast (es2020 compatible)
const findLastBotMessage = (messages: any[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === 'bot') {
      return messages[i];
    }
  }
  return undefined;
};

export const MobileChatButton: React.FC<MobileChatButtonProps> = ({ 
  onFiltersChange, 
  isOpen, 
  onOpenChange 
}) => {
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
    isInitializing: speechInitializing,
    hasPermission: micPermission
  } = useSpeechToText({
    maxRecordingTime: 30000,
    silenceTimeout: 4000
  });

  const {
    isSpeaking,
    error: ttsError,
    speak,
    stop: stopSpeaking,
    replay: replayLastMessage,
    isSupported: ttsSupported,
    isMuted,
    toggleMute,
    isInitializing: ttsInitializing,
    lastSpokenMessage,
    currentVoice,
    canAutoPlay,
    requestPlayPermission,
    isMobile
  } = useTextToSpeech();

  useEffect(() => {
    startChat();
  }, [startChat]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current && isOpen) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  // Enhanced mobile transcript handling
  useEffect(() => {
    if (transcript && transcript.length > 3 && isOpen) {
      console.log('📱 Processing mobile transcript:', transcript);
      setInputValue(transcript);
      resetTranscript();
      
      // Auto-send with mobile-optimized delay
      setTimeout(() => {
        if (transcript.trim()) {
          sendMessage({ content: transcript.trim(), sender: 'user' });
          setInputValue('');
        }
      }, 700);
    }
  }, [transcript, resetTranscript, sendMessage, isOpen]);

  // Enhanced mobile TTS auto-speak
  useEffect(() => {
    if (messages.length === 0 || isSending || !isOpen) return;

    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && 
        lastMessage.sender === 'bot' && 
        lastMessage.id !== lastBotMessageIdRef.current &&
        ttsSupported && 
        !isMuted && 
        lastMessage.content.length > 0) {
      
      console.log('📱 New mobile bot message for TTS:', lastMessage.id);
      lastBotMessageIdRef.current = lastMessage.id;
      
      // Mobile TTS - only play if we have active audio permission
      if (canAutoPlay) {
        console.log('📱 Mobile auto-playing TTS response');
        speak(lastMessage.content, lastMessage.id);
      } else {
        console.log('📱 Mobile TTS requires manual trigger');
      }
    }
  }, [messages, speak, ttsSupported, isMuted, isOpen, isSending, canAutoPlay]);

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

  const handleVoiceToggle = async () => {
    if (isListening || speechInitializing) {
      console.log('📱 Stopping mobile voice input');
      stopListening();
    } else {
      console.log('📱 Starting mobile voice input');
      
      // Stop TTS when starting to listen
      if (isSpeaking) {
        stopSpeaking();
      }
      
      // Request TTS permission when user taps mic (critical for mobile)
      if (!canAutoPlay) {
        await requestPlayPermission();
      }
      
      await startListening();
    }
  };

  const handleManualPlay = async () => {
    // Request permission and play the last bot message
    const hasPermission = await requestPlayPermission();
    if (hasPermission && messages.length > 0) {
      const lastBotMessage = findLastBotMessage(messages);
      if (lastBotMessage) {
        speak(lastBotMessage.content, lastBotMessage.id);
      }
    }
  };

  const handleStartConversation = async () => {
    // Request permission when starting conversation on mobile
    if (!canAutoPlay) {
      await requestPlayPermission();
    }
    
    const welcomeMessage = "¡Hola! Soy tu asistente de compras de StrateAI. Puedo ayudarte a encontrar productos específicos basándome en nuestro inventario real. Por ejemplo, puedes preguntarme: Muéstrame televisores de 55 pulgadas bajo 800 dólares o Busco audífonos inalámbricos. ¿En qué puedo ayudarte hoy?";
    sendMessage({ content: welcomeMessage, sender: 'bot' });
  };

  const voiceButtonVariant = (isListening || speechInitializing) ? "destructive" : "outline";
  const voiceButtonClass = (isListening || speechInitializing) ? 
    "bg-red-100 text-red-600 border-red-300 animate-pulse" : "";

  // Mobile-specific manual play button logic
  const shouldShowManualPlay = !canAutoPlay && messages.length > 0 && 
    messages[messages.length - 1]?.sender === 'bot' && !isSpeaking && !ttsInitializing;

  return (
    <>
      {/* Floating Chat Button */}
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg lg:hidden"
            aria-label="Abrir chat"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
          <SheetHeader className="p-4 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <SheetTitle className="text-left">Asistente StrateAI</SheetTitle>
                  <SheetDescription className="text-left">
                    {messages.length === 0 
                      ? 'Listo para ayudarte' 
                      : `En línea • ${speechSupported ? 'Voz disponible' : 'Solo texto'} • ${currentVoice || 'Voz predeterminada'} • Móvil`}
                  </SheetDescription>
                </div>
              </div>
            </div>
            
            {/* Voice Indicator for Mobile */}
            <div className="mt-2">
              <VoiceIndicator
                isListening={isListening}
                isSpeaking={isSpeaking}
                speechInitializing={speechInitializing}
                ttsInitializing={ttsInitializing}
                speechSupported={speechSupported}
                ttsSupported={ttsSupported}
                isMuted={isMuted}
                onStopSpeaking={stopSpeaking}
                onReplay={replayLastMessage}
                onToggleMute={toggleMute}
                className="justify-start"
              />
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">¡Comencemos a chatear!</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Pregúntame sobre cualquier producto. Tengo acceso a todo nuestro inventario real.
                  {speechSupported && ' También puedes usar tu voz.'}
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
                    {index < messages.length - 1 && <div className="border-t border-border/50" />}
                  </React.Fragment>
                ))}
                {isSending && (
                  <>
                    <div className="border-t border-border/50" />
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

          {/* Enhanced Manual Play Button for Mobile */}
          {shouldShowManualPlay && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
              <Button
                onClick={handleManualPlay}
                variant="outline"
                size="sm"
                className="w-full text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                <Play className="h-4 w-4 mr-2" />
                Toca para escuchar respuesta
              </Button>
            </div>
          )}

          {/* Voice/TTS Status and Error Messages */}
          {(speechError || ttsError) && (
            <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
              <p className="text-xs text-destructive">
                ❌ {speechError || ttsError}
              </p>
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
                      : micPermission 
                        ? 'Iniciar grabación de voz'
                        : 'Permitir micrófono para usar voz'
                  }
                  aria-label={
                    isListening || speechInitializing 
                      ? 'Parar grabación de voz' 
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
                aria-label="Enviar mensaje"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              {speechSupported ? (micPermission ? 'Voz activa' : 'Voz requiere permisos') : 'Solo texto'} • 
              {ttsSupported && lastSpokenMessage && 'Última respuesta disponible para repetir • '}
              {canAutoPlay ? 'Audio móvil activo' : 'Audio móvil manual'} • 
              Integrado con OpenAI
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
