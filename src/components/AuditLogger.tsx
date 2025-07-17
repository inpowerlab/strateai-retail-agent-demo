
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

export const AuditLogger: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAuditLogs();
    }
  }, [user]);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching audit logs:', error);
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'default';
      case 'read':
        return 'secondary';
      case 'update':
        return 'outline';
      case 'delete':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!user) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>System Audit Trail</CardTitle>
        <CardDescription>
          Real-time logging of all system operations and user actions
        </CardDescription>
        <Button onClick={fetchAuditLogs} disabled={loading}>
          Refresh Logs
        </Button>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {log.action.toUpperCase()}
                  </Badge>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{log.resource_type}</span>
                      <span className="text-sm text-muted-foreground">
                        ID: {log.resource_id.substring(0, 8)}...
                      </span>
                    </div>
                    
                    {log.details && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {typeof log.details === 'string' 
                          ? log.details 
                          : JSON.stringify(log.details, null, 2)
                        }
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                      {log.ip_address && ` • IP: ${log.ip_address}`}
                    </div>
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
