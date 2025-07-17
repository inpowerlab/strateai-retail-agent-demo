
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, MessageSquare, Loader2, Mic, MicOff } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { MobileAudioUnlock } from './MobileAudioUnlock';
import { MobileTTSIndicator } from './MobileTTSIndicator';
import { useChat } from '@/hooks/useChat';
import { useMobileVoiceManager } from '@/hooks/useMobileVoiceManager';
import { ProductFilters } from '@/types/database';

interface ChatInterfaceProps {
  onFiltersChange?: (filters: ProductFilters) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onFiltersChange }) => {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastBotMessageIdRef = useRef<string | null>(null);
  
  const { messages, sendMessage, isSending, startChat } = useChat(onFiltersChange);
  
  // Use the mobile voice manager for coordinated voice handling
  const voiceManager = useMobileVoiceManager({
    onTranscript: (transcript) => {
      console.log('🖥️ Desktop transcript received:', transcript);
      setInputValue(transcript);
      
      // Auto-send after delay
      setTimeout(() => {
        if (transcript.trim() && !isSending) {
          sendMessage({ content: transcript.trim(), sender: 'user' });
          setInputValue('');
        }
      }, 500);
    },
    onError: (error) => {
      console.error('🖥️ Desktop voice error:', error);
    },
    autoStopOnSpeech: true
  });

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

  // Auto-play TTS for new bot messages
  useEffect(() => {
    if (messages.length === 0 || isSending) return;

    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && 
        lastMessage.sender === 'bot' && 
        lastMessage.id !== lastBotMessageIdRef.current &&
        lastMessage.content.length > 0) {
      
      console.log(`🤖 Auto-playing TTS for new bot message: ${lastMessage.id}`);
      lastBotMessageIdRef.current = lastMessage.id;
      
      // Use voice manager for coordinated TTS playback
      voiceManager.playVoiceOutput(lastMessage.content, lastMessage.id);
    }
  }, [messages, isSending, voiceManager]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Handle gesture if needed
    if (!voiceManager.isAudioUnlocked && voiceManager.isMobile) {
      await voiceManager.handleUniversalGesture();
    }

    try {
      sendMessage({ content: userMessage, sender: 'user' });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleVoiceToggle = async () => {
    console.log('🎤 Voice toggle clicked');
    await voiceManager.toggleVoiceInput();
  };

  const handleStartConversation = async () => {
    // Handle gesture for audio unlock
    if (!voiceManager.isAudioUnlocked && voiceManager.isMobile) {
      await voiceManager.handleUniversalGesture();
    }
    
    const welcomeMessage = "¡Hola! Soy tu asistente de compras de StrateAI con voz premium de Google Cloud optimizada para todos los dispositivos. Puedo ayudarte a encontrar productos específicos basándome en nuestro inventario real. Por ejemplo, puedes preguntarme: Muéstrame televisores de 55 pulgadas bajo 800 dólares o Busco audífonos inalámbricos. ¿En qué puedo ayudarte hoy?";
    sendMessage({ content: welcomeMessage, sender: 'bot' });
  };

  const getMicButtonState = () => {
    if (voiceManager.isListening) {
      return {
        className: "h-14 w-14 bg-red-500 hover:bg-red-600 text-white border-2 border-red-300 animate-pulse scale-110",
        icon: MicOff,
        title: "Toca para parar grabación"
      };
    }
    
    return {
      className: `h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-2 border-blue-300 hover:scale-105 ${
        !voiceManager.isAudioUnlocked && voiceManager.isMobile ? 'animate-pulse' : ''
      }`,
      icon: Mic,
      title: voiceManager.isAudioUnlocked ? 
        'Toca para hablar' : 
        'Toca para activar audio y voz'
    };
  };

  const micButtonState = getMicButtonState();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile Audio Unlock Component */}
      {voiceManager.requiresUserGesture && (
        <MobileAudioUnlock
          onUnlock={voiceManager.handleUniversalGesture}
          isMobile={voiceManager.isMobile}
          requiresGesture={voiceManager.requiresUserGesture}
          error={voiceManager.error}
        />
      )}

      {/* Enhanced Chat Header */}
      <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Asistente StrateAI</h2>
            <p className="text-sm text-muted-foreground font-medium">
              {voiceManager.voiceStatus} • {voiceManager.currentVoice || 'Google Cloud Premium'}
              {voiceManager.isMobile ? ' • Móvil' : ''}
            </p>
          </div>
        </div>
        
        {/* Mobile TTS Status Indicator */}
        <div className="mt-4">
          <MobileTTSIndicator
            isPlaying={voiceManager.isSpeaking}
            isInitializing={voiceManager.isListening}
            isMobile={voiceManager.isMobile}
            isAudioUnlocked={voiceManager.isAudioUnlocked}
            currentMethod={voiceManager.currentMethod}
            currentVoice={voiceManager.currentVoice}
            error={voiceManager.error}
            onStop={voiceManager.stopVoiceOutput}
            onUnlock={voiceManager.handleUniversalGesture}
          />
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl mb-6">
              <MessageSquare className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-4">¡Comencemos a chatear!</h3>
            <p className="text-muted-foreground mb-6 max-w-md text-lg leading-relaxed">
              Pregúntame sobre cualquier producto. Tengo acceso a todo nuestro inventario real y puedo ayudarte a encontrar exactamente lo que buscas.
              {voiceManager.isSupported && ' También puedes usar tu voz para hablar conmigo.'}
            </p>
            <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-sm font-medium text-primary mb-1">
                🌩️ Voz Premium {voiceManager.isMobile ? 'Móvil ' : ''}Activada
              </div>
              <div className="text-xs text-muted-foreground">
                Google Cloud Text-to-Speech + Fallback automático + Coordinación bidireccional
              </div>
              {voiceManager.isMobile && !voiceManager.isAudioUnlocked && (
                <div className="text-xs text-orange-600 mt-1">
                  📱 Toca cualquier botón para habilitar el audio en móvil
                </div>
              )}
            </div>
            <Button 
              onClick={handleStartConversation} 
              size="lg" 
              className="h-12 px-8 text-lg font-semibold shadow-lg"
            >
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
                <div className="flex gap-4 p-6 bg-gradient-to-r from-muted/30 to-muted/50">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                    <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-base font-bold">Asistente StrateAI</span>
                    </div>
                    <div className="text-base text-muted-foreground font-medium">
                      Analizando productos disponibles...
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Error Messages */}
      {voiceManager.error && !voiceManager.requiresUserGesture && (
        <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20">
          <p className="text-sm text-destructive font-medium">
            ❌ {voiceManager.error}
          </p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={voiceManager.isSupported ? "Escribe tu mensaje o usa el micrófono..." : "Pregúntame sobre productos disponibles..."}
            disabled={isSending || voiceManager.isListening}
            className="flex-1 h-14 text-lg px-6 border-2 shadow-lg font-medium placeholder:text-muted-foreground/70"
            maxLength={500}
          />
          
          {/* Voice Button */}
          {voiceManager.isSupported && (
            <Button
              type="button"
              onClick={handleVoiceToggle}
              disabled={isSending}
              size="lg"
              className={`shadow-lg transition-all duration-200 ${micButtonState.className}`}
              title={micButtonState.title}
            >
              <micButtonState.icon className="h-7 w-7" />
            </Button>
          )}
          
          {/* Send Button */}
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isSending || voiceManager.isListening}
            size="lg"
            className="h-14 w-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg border-2 border-green-300 hover:scale-105 transition-all duration-200"
          >
            {isSending ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Send className="h-7 w-7" />
            )}
          </Button>
        </form>
        
        {/* Status Bar */}
        <div className="mt-3 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            <span className="inline-flex items-center gap-1">
              🌩️ Google Cloud Premium TTS • Coordinación Bidireccional
              {voiceManager.isMobile ? ' • Móvil Optimizado' : ''}
            </span>
            {voiceManager.isSupported && (
              <>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <Mic className="h-4 w-4" />
                  {voiceManager.isAudioUnlocked ? 'Voz activa' : 'Toca micrófono para activar'}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
