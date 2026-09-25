import React from 'react';
import { FilterState } from '../../types';

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  productCount: number;
}

const CATEGORIES = ['All', 'Pendants', 'Bracelets', 'Chains', 'Rings', 'Wallets', 'Accessories'];
const STYLES = ['All', 'Gothic', 'Y2K', 'Cyber', 'Industrial', 'Minimalist'];
const COLORS = ['All', 'Silver', 'Chrome', 'Obsidian', 'Gunmetal'];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  productCount,
}) => {
  return (
    <aside className="w-64 shrink-0 space-y-7 text-xs text-[#9A9AA3]">
      <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7]">
          Filters ({productCount})
        </h3>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-[11px] text-[#8B5CF6] hover:text-[#00D9FF] uppercase tracking-wider font-semibold transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Category Filter */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#F5F5F7]">
          Category
        </label>
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = (cat === 'All' && !filters.category) || filters.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onFilterChange('category', cat === 'All' ? '' : cat)}
                className={`text-left py-1 px-2 rounded-sm transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#15151B] text-[#F5F5F7] font-semibold border-l-2 border-[#8B5CF6]'
                    : 'text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style Filter */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#F5F5F7]">
          Aesthetic Style
        </label>
        <div className="flex flex-col gap-1.5">
          {STYLES.map((st) => {
            const isSelected = (st === 'All' && !filters.style) || filters.style === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => onFilterChange('style', st === 'All' ? '' : st)}
                className={`text-left py-1 px-2 rounded-sm transition-colors ${
                  isSelected
                    ? 'bg-[#15151B] text-[#F5F5F7] font-semibold border-l-2 border-[#00D9FF]'
                    : 'text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-[11px]">
          <span className="font-bold uppercase tracking-widest text-[#F5F5F7]">Max Price</span>
          <span className="font-mono-numbers font-semibold text-[#F5F5F7]">₹{filters.maxPrice}</span>
        </div>
        <input
          type="range"
          min="499"
          max="2500"
          step="50"
          value={filters.maxPrice}
          onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
          className="w-full accent-[#8B5CF6] bg-[#2A2A32] h-1.5 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#9A9AA3] font-mono-numbers">
          <span>₹499</span>
          <span>₹2,500</span>
        </div>
      </div>

      {/* Color Filter */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#F5F5F7]">
          Finish / Tone
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((col) => {
            const isSelected = (col === 'All' && !filters.color) || filters.color === col;
            return (
              <button
                key={col}
                type="button"
                onClick={() => onFilterChange('color', col === 'All' ? '' : col)}
                className={`px-2.5 py-1 text-[11px] border transition-colors ${
                  isSelected
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/20 text-white font-medium'
                    : 'border-[#2A2A32] bg-[#15151B] text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                {col}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Toggles */}
      <div className="pt-2 border-t border-[#2A2A32] space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onFilterChange('inStockOnly', e.target.checked)}
            className="w-4 h-4 accent-[#8B5CF6] bg-[#15151B] border-[#2A2A32]"
          />
          <span className="text-xs text-[#C7CBD3]">In Stock Only</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.newArrivalsOnly}
            onChange={(e) => onFilterChange('newArrivalsOnly', e.target.checked)}
            className="w-4 h-4 accent-[#8B5CF6] bg-[#15151B] border-[#2A2A32]"
          />
          <span className="text-xs text-[#C7CBD3]">New Arrivals</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.bestSellersOnly}
            onChange={(e) => onFilterChange('bestSellersOnly', e.target.checked)}
            className="w-4 h-4 accent-[#8B5CF6] bg-[#15151B] border-[#2A2A32]"
          />
          <span className="text-xs text-[#C7CBD3]">Best Sellers</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.minRating === 4.8}
            onChange={(e) => onFilterChange('minRating', e.target.checked ? 4.8 : 0)}
            className="w-4 h-4 accent-[#8B5CF6] bg-[#15151B] border-[#2A2A32]"
          />
          <span className="text-xs text-[#C7CBD3]">Top Rated (4.8+ ★)</span>
        </label>
      </div>
    </aside>
  );
};
