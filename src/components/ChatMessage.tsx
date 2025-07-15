
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

  return (
    <div className={cn(
      "flex gap-3 p-4",
      isBot ? "bg-muted/50" : "bg-background"
    )}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={cn(
          isBot ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}>
          {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isBot ? 'Asistente StrateAI' : 'Tú'}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
};
