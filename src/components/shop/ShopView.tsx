import React, { useState, useMemo, useEffect } from 'react';
import { SlidersHorizontal, Search, RotateCcw } from 'lucide-react';
import { PRODUCTS } from '../../data/products';
import { FilterState, SortOption } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { FilterSidebar } from './FilterSidebar';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import { useNavigation } from '../../context/NavigationContext';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';

const INITIAL_FILTERS: FilterState = {
  searchQuery: '',
  category: '',
  minPrice: 0,
  maxPrice: 2500,
  color: '',
  inStockOnly: false,
  minRating: 0,
  style: '',
  newArrivalsOnly: false,
  bestSellersOnly: false,
};

export const ShopView: React.FC = () => {
  const { params } = useNavigation();

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...INITIAL_FILTERS,
    category: params.category || '',
    searchQuery: params.search || '',
    style: params.style || '',
  }));

  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Sync navigation params if navigated from elsewhere
  useEffect(() => {
    if (params.category !== undefined || params.search !== undefined || params.style !== undefined) {
      setFilters((prev) => ({
        ...prev,
        category: params.category || '',
        searchQuery: params.search || '',
        style: params.style || '',
      }));
    }
  }, [params]);

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSortBy('featured');
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(query);
        const matchCat = product.category.toLowerCase().includes(query);
        const matchDesc = product.description.toLowerCase().includes(query);
        const matchTags = product.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchName && !matchCat && !matchDesc && !matchTags) return false;
      }

      // Category
      if (filters.category && product.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }

      // Style
      if (filters.style && product.style.toLowerCase() !== filters.style.toLowerCase()) {
        return false;
      }

      // Color
      if (filters.color && product.color.toLowerCase() !== filters.color.toLowerCase()) {
        return false;
      }

      // Price
      if (product.price > filters.maxPrice) {
        return false;
      }

      // In stock
      if (filters.inStockOnly && product.stock <= 0) {
        return false;
      }

      // Min rating
      if (filters.minRating > 0 && product.rating < filters.minRating) {
        return false;
      }

      // New arrivals
      if (filters.newArrivalsOnly && !product.isNewArrival) {
        return false;
      }

      // Best sellers
      if (filters.bestSellersOnly && !product.isBestSeller) {
        return false;
      }

      return true;
    });
  }, [filters]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'newest':
        return list.filter((p) => p.isNewArrival).concat(list.filter((p) => !p.isNewArrival));
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price);
      case 'popular':
        return list.sort((a, b) => b.reviewCount - a.reviewCount);
      case 'featured':
      default:
        return list.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
    }
  }, [filteredProducts, sortBy]);

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title Header */}
        <ScrollReveal animation="fade-up">
          <div className="pb-8 border-b border-[#2A2A32] flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#8B5CF6] font-semibold">
                THE HARDWARE ARCHIVE
              </span>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase mt-1">
                {filters.category ? `${filters.category} Collection` : 'All Accessories'}
              </h1>
              <p className="text-xs text-[#9A9AA3] mt-2">
                Showing {sortedProducts.length} of {PRODUCTS.length} signature darkwear pieces
              </p>
            </div>

            {/* Search bar inside shop */}
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9AA3]" />
              <input
                type="text"
                placeholder="Search accessories..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                className="w-full bg-[#15151B] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-[#F5F5F7] placeholder-[#9A9AA3] pl-9 pr-4 py-2.5 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Toolbar: Mobile filter trigger + Sorting dropdown */}
        <div className="py-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 bg-[#15151B] border border-[#2A2A32] text-xs font-semibold uppercase tracking-wider text-[#F5F5F7]"
          >
            <SlidersHorizontal size={14} className="text-[#8B5CF6]" />
            <span>Filters</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs text-[#9A9AA3]">
            <span>Active filters:</span>
            {filters.category && (
              <span className="px-2 py-0.5 bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] animate-in fade-in">
                {filters.category}
              </span>
            )}
            {filters.style && (
              <span className="px-2 py-0.5 bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] animate-in fade-in">
                {filters.style}
              </span>
            )}
            {filters.color && (
              <span className="px-2 py-0.5 bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] animate-in fade-in">
                {filters.color}
              </span>
            )}
            {filters.newArrivalsOnly && (
              <span className="px-2 py-0.5 bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] animate-in fade-in">
                New Only
              </span>
            )}
            {!filters.category && !filters.style && !filters.color && !filters.newArrivalsOnly && (
              <span className="text-[#9A9AA3]">None</span>
            )}
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[#9A9AA3] hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-[#15151B] border border-[#2A2A32] text-xs font-medium text-[#F5F5F7] px-3 py-2 focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
            >
              <option value="featured">Featured Drops</option>
              <option value="newest">Newest Releases</option>
              <option value="popular">Most Popular</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>

        {/* Main Content: Sidebar + Products Grid */}
        <div className="flex gap-8 lg:gap-12 mt-4 items-start">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              productCount={sortedProducts.length}
            />
          </div>

          {/* Products Column */}
          <div className="flex-1">
            {sortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {sortedProducts.map((product, idx) => (
                  <ScrollReveal key={product.id} animation="fade-up" delay={Math.min(idx * 50, 400)}>
                    <ProductCard product={product} priority={idx < 6} />
                  </ScrollReveal>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="py-24 text-center border border-[#2A2A32] bg-[#15151B] p-8 animate-in fade-in duration-300">
                <div className="w-14 h-14 mx-auto rounded-full border border-[#2A2A32] flex items-center justify-center text-[#9A9AA3] mb-4">
                  <RotateCcw size={20} />
                </div>
                <h3 className="font-display text-lg font-bold text-[#F5F5F7]">
                  NO ACCESSORIES MATCH YOUR FILTER
                </h3>
                <p className="text-xs text-[#9A9AA3] mt-2 max-w-sm mx-auto">
                  Try broadening your price range, clearing selected filters, or searching with another keyword.
                </p>
                <div className="mt-6 flex justify-center">
                  <Magnetic strength={12}>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
                    >
                      Reset All Filters
                    </button>
                  </Magnetic>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileFilterDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        productCount={sortedProducts.length}
      />
    </div>
  );
};
