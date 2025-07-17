
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getInventoryAdminUrl, 
  navigateToInventoryAdmin, 
  openInventoryAdminInNewTab,
  isInventoryAdminPage 
} from '@/utils/adminUrl';
import { ExternalLink, ArrowRight, Info } from 'lucide-react';

export const AdminUrlDemo: React.FC = () => {
  const adminUrl = getInventoryAdminUrl();
  const isCurrentlyOnAdminPage = isInventoryAdminPage();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Inventory Admin URL System
        </CardTitle>
        <CardDescription>
          Universal URL builder for the inventory admin page at /superjp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Current Admin URL:</p>
          <code className="text-sm bg-background p-2 rounded border block">
            {adminUrl}
          </code>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={navigateToInventoryAdmin}
            variant="default"
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Go to Admin
          </Button>
          
          <Button 
            onClick={openInventoryAdminInNewTab}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </Button>
        </div>
        
        {isCurrentlyOnAdminPage && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <p className="text-green-800 text-sm font-medium">
              ✓ You are currently on the inventory admin page
            </p>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Works across all environments (development, staging, production)</p>
          <p>• Automatically adapts to any domain or subdomain</p>
          <p>• No manual configuration required per deployment</p>
          <p>• Supports both SPA and SSR environments</p>
        </div>
      </CardContent>
    </Card>
  );
};
