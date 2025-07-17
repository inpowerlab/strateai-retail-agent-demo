
import React from 'react';
import { AuditLogger } from '@/components/AuditLogger';

const AuditDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Audit Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor system activity and track all operations
        </p>
      </div>
      
      <AuditLogger />
    </div>
  );
};

export default AuditDashboard;
