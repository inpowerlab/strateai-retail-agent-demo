
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, MessageSquare, Loader2, Mic, MicOff, Play } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { VoiceIndicator } from './VoiceIndicator';
import { useChat } from '@/hooks/useChat';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { ProductFilters } from '@/types/database';

interface ChatInterfaceProps {
  onFiltersChange?: (filters: ProductFilters) => void;
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
    isInitializing: speechInitializing,
    hasPermission: micPermission
  } = useSpeechToText({
    maxRecordingTime: 30000,
    silenceTimeout: 3000
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
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Enhanced voice transcript handling
  useEffect(() => {
    if (transcript && transcript.length > 3) {
      console.log('🗣️ Processing transcript:', transcript);
      setInputValue(transcript);
      resetTranscript();
      
      // Auto-send after delay
      setTimeout(() => {
        if (transcript.trim()) {
          sendMessage({ content: transcript.trim(), sender: 'user' });
          setInputValue('');
        }
      }, 500);
    }
  }, [transcript, resetTranscript, sendMessage]);

  // Enhanced mobile TTS auto-speak with proper gesture handling
  useEffect(() => {
    if (messages.length === 0 || isSending) return;

    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && 
        lastMessage.sender === 'bot' && 
        lastMessage.id !== lastBotMessageIdRef.current &&
        ttsSupported && 
        !isMuted && 
        lastMessage.content.length > 0) {
      
      console.log(`🤖 New bot message for TTS: ${lastMessage.id} (${isMobile ? 'mobile' : 'desktop'})`);
      lastBotMessageIdRef.current = lastMessage.id;
      
      // Mobile vs Desktop TTS handling
      if (isMobile) {
        // On mobile, only auto-play if we have active audio context from recent user gesture
        if (canAutoPlay) {
          console.log('📱 Mobile auto-playing TTS response');
          speak(lastMessage.content, lastMessage.id);
        } else {
          console.log('📱 Mobile TTS requires manual trigger');
        }
      } else {
        // Desktop can use delayed auto-play
        if (canAutoPlay) {
          console.log('🖥️ Desktop auto-playing TTS response');
          setTimeout(() => {
            speak(lastMessage.content, lastMessage.id);
          }, 800);
        } else {
          console.log('🖥️ Desktop TTS requires user interaction');
        }
      }
    }
  }, [messages, speak, ttsSupported, isMuted, isSending, canAutoPlay, isMobile]);

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
      console.log('🛑 Stopping voice input');
      stopListening();
    } else {
      console.log('🎤 Starting voice input');
      
      // Stop TTS when starting to listen
      if (isSpeaking) {
        stopSpeaking();
      }
      
      // Request TTS permission when user interacts (critical for mobile)
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
    // Request permission when starting conversation
    if (!canAutoPlay) {
      await requestPlayPermission();
    }
    
    const welcomeMessage = "¡Hola! Soy tu asistente de compras de StrateAI. Puedo ayudarte a encontrar productos específicos basándome en nuestro inventario real. Por ejemplo, puedes preguntarme: Muéstrame televisores de 55 pulgadas bajo 800 dólares o Busco audífonos inalámbricos. ¿En qué puedo ayudarte hoy?";
    sendMessage({ content: welcomeMessage, sender: 'bot' });
  };

  const voiceButtonVariant = (isListening || speechInitializing) ? "destructive" : "outline";
  const voiceButtonClass = (isListening || speechInitializing) ? 
    "bg-red-100 text-red-600 border-red-300 animate-pulse" : "";

  // Enhanced manual play button logic with mobile optimization
  const shouldShowManualPlay = messages.length > 0 && 
    messages[messages.length - 1]?.sender === 'bot' && 
    !isSpeaking && 
    !ttsInitializing && 
    (isMobile || !canAutoPlay);

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
                : `En línea • ${speechSupported ? 'Voz disponible' : 'Solo texto'} • ${currentVoice || 'Voz predeterminada'} • ${isMobile ? 'Móvil' : 'Escritorio'}`}
            </p>
          </div>
        </div>
        
        {/* Voice Indicator */}
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

      {/* Enhanced Manual Play Button - Mobile Optimized */}
      {shouldShowManualPlay && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <Button
            onClick={handleManualPlay}
            variant="outline"
            size="sm"
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-100"
          >
            <Play className="h-4 w-4 mr-2" />
            {isMobile ? 'Toca para escuchar respuesta' : 'Reproducir respuesta'}
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
          Presiona Enter para enviar • Máximo 500 caracteres • 
          {speechSupported ? (micPermission ? ' Voz activa' : ' Voz requiere permisos') : ' Solo texto'} • 
          {ttsSupported && lastSpokenMessage && ' Última respuesta disponible para repetir • '}
          {isMobile ? (canAutoPlay ? 'Audio móvil activo' : 'Audio móvil manual') : (canAutoPlay ? 'Audio automático' : 'Audio manual')} • 
          Integrado con OpenAI
        </p>
      </div>
    </div>
  );
};
