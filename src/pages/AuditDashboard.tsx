
import React from 'react';
import { AuditLogger } from '@/components/AuditLogger';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AuditDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
          
          <h1 className="text-3xl font-bold">System Audit Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor all system operations, user actions, and security events
          </p>
        </div>
        
        <AuditLogger />
      </div>
    </div>
  );
};

export default AuditDashboard;
