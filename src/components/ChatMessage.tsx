
import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/types/database';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.sender === 'bot';
  const isSystem = message.content.includes('Analizando productos') || 
                  message.content.includes('Escuchando') || 
                  message.content.includes('Hablando');

  // System/status messages get special styling
  if (isSystem) {
    return (
      <div className="flex justify-center p-3">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700">
              {message.content}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-4 p-6",
      isBot ? "bg-gradient-to-r from-muted/30 to-muted/50" : "bg-background"
    )}>
      {/* Avatar - larger for POS visibility */}
      <Avatar className="h-12 w-12 flex-shrink-0 shadow-md">
        <AvatarFallback className={cn(
          "text-lg font-semibold",
          isBot 
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" 
            : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
        )}>
          {isBot ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Header with larger, more visible text */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-base font-bold text-foreground">
            {isBot ? 'Asistente StrateAI' : 'Usuario'}
          </span>
          <span className="text-sm text-muted-foreground font-medium">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Message content with enhanced styling */}
        <div className={cn(
          "text-base leading-relaxed whitespace-pre-wrap break-words p-4 rounded-xl shadow-sm",
          isBot 
            ? "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 border border-slate-200 font-normal" 
            : "bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold ml-auto max-w-[80%]"
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
};
