
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditEvent {
  timestamp: string;
  action: string;
  details: string;
  type: 'info' | 'warning' | 'error';
}

export const AuditLogger: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setIsLoading(true);
      
      // Get recent conversations and messages as audit trail
      const { data: conversations, error: convError } = await supabase
        .from('conversaciones')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      const { data: messages, error: msgError } = await supabase
        .from('mensajes')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (convError || msgError) {
        console.error('Error loading activity:', convError || msgError);
        return;
      }

      // Convert to audit events
      const auditEvents: AuditEvent[] = [];

      conversations?.forEach(conv => {
        auditEvents.push({
          timestamp: conv.started_at,
          action: 'Conversation Started',
          details: `Session: ${conv.session_id.substring(0, 8)}...`,
          type: 'info'
        });
      });

      messages?.forEach(msg => {
        auditEvents.push({
          timestamp: msg.timestamp,
          action: `Message ${msg.sender === 'user' ? 'Sent' : 'Received'}`,
          details: `${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`,
          type: msg.sender === 'user' ? 'info' : 'warning'
        });
      });

      // Sort by timestamp
      auditEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setEvents(auditEvents.slice(0, 30)); // Keep last 30 events
    } catch (error) {
      console.error('Error in loadRecentActivity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventColor = (type: AuditEvent['type']) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>System Activity Audit</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="text-center py-4">Loading activity...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No recent activity</div>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getEventColor(event.type)}>{event.action}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{event.details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
