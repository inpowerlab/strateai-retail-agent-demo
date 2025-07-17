
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageSquare, Send, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { MobileAudioUnlock } from './MobileAudioUnlock';
import { MobileTTSIndicator } from './MobileTTSIndicator';
import { useChat } from '@/hooks/useChat';
import { useMobileVoiceManager } from '@/hooks/useMobileVoiceManager';
import { ProductFilters } from '@/types/database';

interface MobileChatButtonProps {
  onFiltersChange?: (filters: ProductFilters) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileChatButton: React.FC<MobileChatButtonProps> = ({ 
  onFiltersChange, 
  isOpen, 
  onOpenChange 
}) => {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastBotMessageIdRef = useRef<string | null>(null);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  
  const { messages, sendMessage, isSending, startChat } = useChat(onFiltersChange);

  // Initialize mobile voice manager
  const voiceManager = useMobileVoiceManager({
    onTranscript: (transcript) => {
      console.log('📱 Mobile transcript received:', transcript);
      setInputValue(transcript);
      
      // Auto-send after a short delay
      setTimeout(() => {
        if (transcript.trim() && !isSending) {
          sendMessage({ content: transcript.trim(), sender: 'user' });
          setInputValue('');
        }
      }, 700);
    },
    onError: (error) => {
      console.error('📱 Mobile voice error:', error);
    },
    autoStopOnSpeech: true
  });

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

  // Auto-play TTS for new bot messages
  useEffect(() => {
    if (messages.length === 0 || isSending || !isOpen) return;

    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && 
        lastMessage.sender === 'bot' && 
        lastMessage.id !== lastBotMessageIdRef.current &&
        lastMessage.content.length > 0) {
      
      console.log('📱 Auto-playing TTS for new bot message:', lastMessage.id);
      lastBotMessageIdRef.current = lastMessage.id;
      
      // Use voice manager for coordinated TTS playback
      voiceManager.playVoiceOutput(lastMessage.content, lastMessage.id);
    }
  }, [messages, isSending, isOpen, voiceManager]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Handle gesture if needed
    if (!voiceManager.isAudioUnlocked) {
      await voiceManager.handleUniversalGesture();
    }

    try {
      sendMessage({ content: userMessage, sender: 'user' });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleVoiceToggle = async () => {
    console.log('📱 Voice toggle clicked');
    await voiceManager.toggleVoiceInput();
  };

  const handleStartConversation = async () => {
    // Ensure audio is unlocked when starting conversation
    await voiceManager.handleUniversalGesture();
    
    const welcomeMessage = "¡Hola! Soy tu asistente de compras de StrateAI optimizado para móviles. Puedo ayudarte a encontrar productos específicos basándome en nuestro inventario real. Puedes escribir o usar tu voz para preguntarme sobre productos. ¿En qué puedo ayudarte hoy?";
    sendMessage({ content: welcomeMessage, sender: 'bot' });
  };

  const getMicButtonState = () => {
    if (voiceManager.isListening) {
      return {
        variant: "destructive" as const,
        className: "bg-red-500 hover:bg-red-600 text-white animate-pulse",
        icon: MicOff,
        title: "Parar grabación"
      };
    }
    
    return {
      variant: "outline" as const,
      className: voiceManager.isAudioUnlocked ? "bg-blue-500 text-white" : "",
      icon: Mic,
      title: voiceManager.isAudioUnlocked ? "Iniciar grabación de voz" : "Toca para activar audio y voz"
    };
  };

  const micButtonState = getMicButtonState();

  return (
    <>
      {/* Floating Chat Button */}
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg lg:hidden"
            aria-label="Abrir chat"
            onClick={voiceManager.handleUniversalGesture}
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
                    {voiceManager.voiceStatus} • {voiceManager.isMobile ? 'Móvil' : 'Desktop'}
                  </SheetDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Debug toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebugLogs(!showDebugLogs)}
                  className="text-xs"
                >
                  🔍
                </Button>
                
                {/* Audio status */}
                {voiceManager.isSpeaking && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={voiceManager.stopVoiceOutput}
                    className="text-red-600"
                  >
                    <VolumeX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Mobile TTS Status Indicator */}
            <div className="mt-3">
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

            {/* Debug logs */}
            {showDebugLogs && (
              <div className="mt-2 p-2 bg-muted rounded text-xs max-h-32 overflow-y-auto">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Debug Logs:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={voiceManager.clearDebugLogs}
                    className="h-4 text-xs"
                  >
                    Clear
                  </Button>
                </div>
                {voiceManager.debugLogs.map((log, index) => (
                  <div key={index} className="font-mono text-xs">{log}</div>
                ))}
              </div>
            )}
          </SheetHeader>

          {/* Audio unlock prompt */}
          {voiceManager.requiresUserGesture && (
            <MobileAudioUnlock
              onUnlock={voiceManager.handleUniversalGesture}
              isMobile={voiceManager.isMobile}
              requiresGesture={voiceManager.requiresUserGesture}
              error={voiceManager.error}
            />
          )}

          {/* Messages Area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">¡Comencemos a chatear!</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Pregúntame sobre cualquier producto. Tengo acceso a todo nuestro inventario real.
                  {voiceManager.isSupported && ' También puedes usar tu voz.'}
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

          {/* Error Display */}
          {voiceManager.error && (
            <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
              <p className="text-xs text-destructive">
                ❌ {voiceManager.error}
              </p>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t bg-background/95 backdrop-blur-sm">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={voiceManager.isSupported ? "Escribe o usa el micrófono..." : "Pregúntame sobre productos disponibles..."}
                disabled={isSending || voiceManager.isListening}
                className="flex-1"
                maxLength={500}
              />
              
              {voiceManager.isSupported && (
                <Button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={isSending}
                  size="icon"
                  variant={micButtonState.variant}
                  className={`transition-colors ${micButtonState.className}`}
                  title={micButtonState.title}
                >
                  <micButtonState.icon className="h-4 w-4" />
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={!inputValue.trim() || isSending || voiceManager.isListening}
                size="icon"
                aria-label="Enviar mensaje"
                onClick={voiceManager.handleUniversalGesture}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            
            <p className="text-xs text-muted-foreground mt-2">
              {voiceManager.isSupported ? 
                `Voz: ${voiceManager.isAudioUnlocked ? 'Activa' : 'Toca para activar'}` : 
                'Solo texto'
              } • 
              {voiceManager.currentVoice && `${voiceManager.currentVoice} • `}
              Integrado con OpenAI
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
