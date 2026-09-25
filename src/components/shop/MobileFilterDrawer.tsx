import React from 'react';
import { X } from 'lucide-react';
import { FilterState } from '../../types';
import { FilterSidebar } from './FilterSidebar';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  productCount: number;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onResetFilters,
  productCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-4/5 max-w-xs bg-[#0A0A0D] border-r border-[#2A2A32] h-full flex flex-col z-10 animate-in slide-in-from-left duration-200">
        <div className="p-4 border-b border-[#2A2A32] flex items-center justify-between bg-[#15151B]">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7]">
            FILTER PRODUCTS
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#9A9AA3] hover:text-[#F5F5F7]"
            aria-label="Close filters"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <FilterSidebar
            filters={filters}
            onFilterChange={onFilterChange}
            onResetFilters={onResetFilters}
            productCount={productCount}
          />
        </div>

        <div className="p-4 bg-[#15151B] border-t border-[#2A2A32]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Show {productCount} Results
          </button>
        </div>
      </div>
    </div>
  );
};
