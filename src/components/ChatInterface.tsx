
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, MessageSquare, Loader2, Mic, MicOff } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { VoiceIndicator } from './VoiceIndicator';
import { useChat } from '@/hooks/useChat';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useOpenAITTS } from '@/hooks/useOpenAITTS';
import { ProductFilters } from '@/types/database';
import { VoiceAuditDisplay } from './VoiceAuditDisplay';

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
  const [showVoiceAudit, setShowVoiceAudit] = useState(false);
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

  // Use the new OpenAI TTS hook with browser fallback
  const {
    speak,
    stop: stopSpeaking,
    replay: replayLastMessage,
    isPlaying: isSpeaking,
    isInitializing: ttsInitializing,
    error: ttsError,
    currentMethod,
    currentVoice,
    lastPlayedText
  } = useOpenAITTS({
    voice: 'nova',
    speed: 1.0,
    language: 'es',
    enableFallback: true
  });

  const isSupported = speechSupported; // For voice input
  const ttsSupported = true; // OpenAI TTS is always supported with fallback

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

  // AUTO-PLAY TTS: Immediate voice response after bot reply using OpenAI NOVA
  useEffect(() => {
    if (messages.length === 0 || isSending) return;

    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && 
        lastMessage.sender === 'bot' && 
        lastMessage.id !== lastBotMessageIdRef.current &&
        lastMessage.content.length > 0) {
      
      console.log(`🤖 Auto-playing OpenAI NOVA TTS for new bot message: ${lastMessage.id}`);
      lastBotMessageIdRef.current = lastMessage.id;
      
      // Auto-play TTS with OpenAI NOVA and browser fallback
      speak(lastMessage.content).then(result => {
        if (result.success) {
          console.log(`✅ TTS Success with ${result.method}: ${result.voice}`);
        } else {
          console.error(`❌ TTS Failed: ${result.error}`);
        }
      });
    }
  }, [messages, speak, isSending]);

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
      
      await startListening();
    }
  };

  const handleStartConversation = async () => {
    const welcomeMessage = "¡Hola! Soy tu asistente de compras de StrateAI con voz NOVA de OpenAI. Puedo ayudarte a encontrar productos específicos basándome en nuestro inventario real. Por ejemplo, puedes preguntarme: Muéstrame televisores de 55 pulgadas bajo 800 dólares o Busco audífonos inalámbricos. ¿En qué puedo ayudarte hoy?";
    sendMessage({ content: welcomeMessage, sender: 'bot' });
  };

  // Display current TTS method and voice info
  const getTTSStatusText = () => {
    if (currentMethod === 'openai') {
      return `🎤 NOVA (OpenAI) • Activo`;
    } else if (currentMethod === 'browser') {
      return `🗣️ ${currentVoice} • Fallback Activo`;
    } else if (lastPlayedText) {
      return `🔊 TTS Disponible • Última: ${currentMethod || 'OpenAI'}`;
    }
    return `🎵 OpenAI NOVA + Fallback • Listo`;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Enhanced Chat Header with OpenAI TTS Status */}
      <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Asistente StrateAI</h2>
            <p className="text-sm text-muted-foreground font-medium">
              {messages.length === 0 
                ? 'Listo para ayudarte con tus compras • OpenAI NOVA Voice' 
                : getTTSStatusText()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setShowVoiceAudit(!showVoiceAudit)}
            className="text-sm font-medium"
          >
            🔍 Auditoría de Voz
          </Button>
        </div>
        
        {/* Voice Audit Display */}
        {showVoiceAudit && (
          <div className="mt-4 border rounded-lg p-3 bg-muted/50">
            <VoiceAuditDisplay onAuditComplete={(summary) => console.log('Audit updated:', summary)} />
          </div>
        )}
        
        {/* Enhanced Voice Indicator with OpenAI Status */}
        <div className="mt-4">
          <VoiceIndicator
            isListening={isListening}
            isSpeaking={isSpeaking}
            speechInitializing={speechInitializing}
            ttsInitializing={ttsInitializing}
            speechSupported={speechSupported}
            ttsSupported={ttsSupported}
            isMuted={false}
            onStopSpeaking={stopSpeaking}
            onReplay={replayLastMessage}
            onToggleMute={() => {}}
            className="justify-start"
          />
          
          {/* OpenAI TTS Status Display */}
          {(currentMethod || ttsError) && (
            <div className="mt-2 p-2 rounded-lg bg-muted/30 text-sm">
              {ttsError ? (
                <div className="text-destructive">
                  ❌ TTS Error: {ttsError}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  🎵 TTS Active: {currentMethod === 'openai' ? 'OpenAI NOVA' : `Browser ${currentVoice}`}
                  {currentMethod === 'browser' && (
                    <span className="ml-2 text-amber-600">• Fallback Mode</span>
                  )}
                </div>
              )}
            </div>
          )}
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
              {speechSupported && ' También puedes usar tu voz para hablar conmigo.'}
            </p>
            <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-sm font-medium text-primary mb-1">🎤 Voz Premium Activada</div>
              <div className="text-xs text-muted-foreground">
                OpenAI NOVA + Fallback automático a voces del sistema
              </div>
            </div>
            <Button onClick={handleStartConversation} size="lg" className="h-12 px-8 text-lg font-semibold shadow-lg">
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

      {/* Voice/TTS Status and Error Messages */}
      {(speechError || ttsError) && (
        <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20">
          <p className="text-sm text-destructive font-medium">
            ❌ {speechError || ttsError}
          </p>
        </div>
      )}

      {/* ENHANCED POS INPUT AREA */}
      <div className="p-6 border-t bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={speechSupported ? "Escribe tu mensaje o usa el micrófono..." : "Pregúntame sobre productos disponibles..."}
            disabled={isSending || isListening || speechInitializing}
            className="flex-1 h-14 text-lg px-6 border-2 shadow-lg font-medium placeholder:text-muted-foreground/70"
            maxLength={500}
          />
          
          {/* ENHANCED MICROPHONE BUTTON with OpenAI integration note */}
          {speechSupported && (
            <Button
              type="button"
              onClick={handleVoiceToggle}
              disabled={isSending}
              size="lg"
              className={`h-14 w-14 shadow-lg transition-all duration-200 ${
                (isListening || speechInitializing) 
                  ? "bg-red-500 hover:bg-red-600 text-white border-2 border-red-300 animate-pulse scale-110" 
                  : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-2 border-blue-300 hover:scale-105"
              }`}
              title={
                isListening || speechInitializing 
                  ? 'Toca para parar grabación' 
                  : micPermission 
                    ? 'Toca para hablar (Whisper STT)'
                    : 'Permitir micrófono para usar voz'
              }
              aria-label={
                isListening || speechInitializing 
                  ? 'Parar grabación de voz' 
                  : 'Iniciar grabación de voz con Whisper'
              }
            >
              {(isListening || speechInitializing) ? (
                <MicOff className="h-7 w-7" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </Button>
          )}
          
          {/* ENHANCED SEND BUTTON */}
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isSending || isListening || speechInitializing}
            size="lg"
            className="h-14 w-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg border-2 border-green-300 hover:scale-105 transition-all duration-200"
            aria-label="Enviar mensaje"
            title="Toca para enviar mensaje"
          >
            {isSending ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Send className="h-7 w-7" />
            )}
          </Button>
        </form>
        
        {/* Enhanced Status Text with OpenAI info */}
        <div className="mt-3 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            <span className="inline-flex items-center gap-1">
              🎤 OpenAI NOVA TTS + Browser Fallback
            </span>
            {speechSupported && (
              <>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <Mic className="h-4 w-4" />
                  {micPermission ? 'Toca el micrófono azul para hablar (Whisper)' : 'Permitir micrófono para STT'}
                </span>
              </>
            )}
            <span className="mx-2">•</span>
            <span className="inline-flex items-center gap-1">
              <Send className="h-4 w-4" />
              Toca el botón verde para enviar
            </span>
            {lastPlayedText && (
              <>
                <span className="mx-2">•</span>
                <span>Respuesta disponible para repetir</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
