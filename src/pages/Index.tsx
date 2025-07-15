
import React, { useState } from 'react';
import { ProductGrid } from '@/components/ProductGrid';
import { ChatInterface } from '@/components/ChatInterface';
import { ProductFilters } from '@/types/database';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const [filters, setFilters] = useState<ProductFilters>({});

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm p-4">
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

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r">
          <ProductGrid 
            filters={filters} 
            onFiltersChange={setFilters}
          />
        </div>

        {/* Separator for mobile */}
        <Separator className="lg:hidden" />

        {/* Chat Section */}
        <div className="flex-1 lg:w-1/2 flex flex-col min-h-[400px] lg:min-h-0">
          <ChatInterface onFiltersChange={setFilters} />
        </div>
      </div>
    </div>
  );
};

export default Index;
