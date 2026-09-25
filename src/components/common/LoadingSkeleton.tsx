import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col bg-[#15151B] border border-[#2A2A32] overflow-hidden animate-pulse">
      <div className="aspect-[4/5] bg-[#1e1e27]" />
      <div className="p-4 space-y-2.5">
        <div className="h-3 w-16 bg-[#2A2A32]" />
        <div className="h-4 w-3/4 bg-[#2A2A32]" />
        <div className="h-4 w-20 bg-[#2A2A32]" />
      </div>
    </div>
  );
};

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};
