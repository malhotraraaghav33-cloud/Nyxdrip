import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { PRODUCTS } from '../../data/products';
import { useNavigation } from '../../context/NavigationContext';

export const SearchModal: React.FC = () => {
  const { isSearchModalOpen, closeSearchModal, navigateTo } = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchModalOpen) {
        closeSearchModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, closeSearchModal]);

  if (!isSearchModalOpen) return null;

  const filteredProducts = searchTerm.trim()
    ? PRODUCTS.filter((p) => {
        const query = searchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
        );
      }).slice(0, 6)
    : [];

  const popularSearches = ['Chrome Cross', 'Cyber Ring', 'Spikes', 'Cuban Chain', 'Wallets', 'Obsidian'];

  const handleSelectProduct = (slug: string) => {
    closeSearchModal();
    navigateTo('product', { productId: slug });
  };

  const handleSearchAll = (term: string) => {
    closeSearchModal();
    navigateTo('shop', { search: term });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
        onClick={closeSearchModal}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#15151B] border border-[#2A2A32] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#2A2A32] bg-[#0A0A0D]">
          <Search size={18} className="text-[#9A9AA3] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                handleSearchAll(searchTerm.trim());
              }
            }}
            placeholder="Search chrome crosses, rings, chains, or styles..."
            className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder-[#9A9AA3] focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-[#9A9AA3] hover:text-[#F5F5F7] mr-1"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={closeSearchModal}
            className="p-1 text-xs uppercase tracking-wider text-[#9A9AA3] hover:text-[#F5F5F7] font-semibold"
          >
            ESC
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* Quick Suggestions when empty */}
          {!searchTerm.trim() ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-[#9A9AA3] font-semibold mb-3">
                Trending Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearchAll(term)}
                    className="px-3 py-1.5 text-xs bg-[#0A0A0D] border border-[#2A2A32] hover:border-[#8B5CF6] hover:text-white text-[#C7CBD3] transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {filteredProducts.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[#9A9AA3]">
                    <span>Results ({filteredProducts.length})</span>
                    <button
                      onClick={() => handleSearchAll(searchTerm)}
                      className="text-[#00D9FF] hover:underline flex items-center gap-1 font-medium"
                    >
                      View all results <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="divide-y divide-[#2A2A32]">
                    {filteredProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod.slug)}
                        className="py-3 flex items-center justify-between hover:bg-[#0A0A0D]/50 px-2 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 object-cover bg-[#0A0A0D] border border-[#2A2A32]"
                          />
                          <div>
                            <p className="text-xs uppercase tracking-wider text-[#9A9AA3]">
                              {prod.category} · {prod.style}
                            </p>
                            <p className="text-sm font-semibold text-[#F5F5F7]">
                              {prod.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono-numbers text-xs font-bold text-[#F5F5F7]">
                            ₹{prod.price.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[#F5F5F7] font-semibold">No accessories found</p>
                  <p className="text-xs text-[#9A9AA3] mt-1">
                    Try searching for "pendant", "bracelet", "ring", or "chrome"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
