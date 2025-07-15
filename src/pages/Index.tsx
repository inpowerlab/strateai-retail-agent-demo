
import React, { useState } from 'react';
import { ProductGrid } from '@/components/ProductGrid';
import { ChatInterface } from '@/components/ChatInterface';
import { MobileChatButton } from '@/components/MobileChatButton';
import { ProductFilters } from '@/types/database';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const [filters, setFilters] = useState<ProductFilters>({});
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">StrateAI Retail Demo</h1>
            <p className="text-sm text-muted-foreground">
              Conversational eCommerce Experience
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Demo Mode • No Authentication Required
          </div>
        </div>
      </header>

      {/* Desktop Layout - Split Screen */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 lg:w-1/2 flex flex-col border-r">
          <ProductGrid 
            filters={filters} 
            onFiltersChange={setFilters}
          />
        </div>

        {/* Chat Section */}
        <div className="flex-1 lg:w-1/2 flex flex-col min-h-0">
          <ChatInterface onFiltersChange={setFilters} />
        </div>
      </div>

      {/* Mobile Layout - Stacked with Floating Chat */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
        {/* Products Section - Full Height on Mobile */}
        <div className="flex-1 overflow-hidden">
          <ProductGrid 
            filters={filters} 
            onFiltersChange={setFilters}
          />
        </div>

        {/* Mobile Chat Button */}
        <MobileChatButton 
          onFiltersChange={setFilters}
          isOpen={isMobileChatOpen}
          onOpenChange={setIsMobileChatOpen}
        />
      </div>
    </div>
  );
};

export default Index;
