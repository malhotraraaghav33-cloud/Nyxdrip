import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Heart, User, Menu, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useNavigation, ViewType } from '../../context/NavigationContext';
import { AnnouncementBar } from './AnnouncementBar';

export const Navbar: React.FC = () => {
  const { itemCount, openCart, isCartPulsing } = useCart();
  const { wishlistCount } = useWishlist();
  const { currentView, navigateTo, openSearchModal } = useNavigation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 24) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is active
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks: { label: string; view: ViewType; category?: string }[] = [
    { label: 'Home', view: 'home' },
    { label: 'Shop', view: 'shop' },
    { label: 'Collections', view: 'shop', category: 'Pendants' },
    { label: 'About', view: 'about' },
    { label: 'Contact', view: 'contact' },
  ];

  const handleNavClick = (view: ViewType, category?: string) => {
    navigateTo(view, category ? { category } : {});
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-[100vw] overflow-x-clip transition-colors duration-300">
        <AnnouncementBar />

        {/* Main Navbar Bar */}
        <div
          className={`w-full transition-all duration-300 ${
            isScrolled || currentView !== 'home'
              ? 'bg-[#0A0A0D]/95 backdrop-blur-md border-b border-[#2A2A32]'
              : 'bg-gradient-to-b from-[#0A0A0D]/85 to-transparent border-b border-transparent'
          }`}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 -ml-1 text-[#C7CBD3] hover:text-[#F5F5F7] transition-colors focus-visible:outline-none"
                aria-label="Open mobile menu"
              >
                <Menu size={21} />
              </button>
            </div>

            {/* Zone 1: Brand Wordmark (Fluidly sized, never pushes cart off-screen) */}
            <div className="flex items-center min-w-0 shrink">
              <button
                type="button"
                onClick={() => handleNavClick('home')}
                className="group text-left focus-visible:outline-none flex items-center"
              >
                <span className="font-display text-sm sm:text-xl md:text-2xl font-extrabold tracking-wider sm:tracking-widest text-[#F5F5F7] group-hover:text-white transition-colors truncate">
                  NYX<span className="text-[#8B5CF6]">DRIP</span>STORE
                </span>
              </button>
            </div>

            {/* Zone 2: Navigation Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              {navLinks.map((link) => {
                const isActive = currentView === link.view && (!link.category || currentView === 'shop');
                return (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.view, link.category)}
                    className={`relative text-xs uppercase tracking-widest font-semibold transition-colors duration-200 py-1 ${
                      isActive
                        ? 'text-[#F5F5F7]'
                        : 'text-[#9A9AA3] hover:text-[#F5F5F7]'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#8B5CF6]" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Primary Actions (Search, Wishlist, Account, Cart) */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={openSearchModal}
                className="p-1.5 sm:p-2 text-[#C7CBD3] hover:text-[#00D9FF] transition-colors focus-visible:outline-none"
                aria-label="Search accessories"
              >
                <Search size={18} />
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('wishlist')}
                className="relative p-1.5 sm:p-2 text-[#C7CBD3] hover:text-[#8B5CF6] transition-colors focus-visible:outline-none hidden sm:inline-flex"
                aria-label="View wishlist"
              >
                <Heart size={18} />
                {wishlistCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#8B5CF6] text-white text-[9px] font-bold font-mono-numbers">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="p-1.5 sm:p-2 text-[#C7CBD3] hover:text-[#F5F5F7] transition-colors focus-visible:outline-none hidden md:inline-flex"
                aria-label="Account profile"
              >
                <User size={18} />
              </button>

              <button
                type="button"
                onClick={openCart}
                className={`relative p-1.5 sm:p-2 text-[#C7CBD3] hover:text-[#F5F5F7] transition-all duration-300 focus-visible:outline-none group ${
                  isCartPulsing ? 'animate-cart-pulse text-[#00D9FF]' : ''
                }`}
                aria-label={`Shopping bag with ${itemCount} items`}
              >
                <ShoppingBag size={19} className="group-hover:stroke-white transition-transform group-hover:scale-105" />
                {itemCount > 0 && (
                  <span className={`absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#00D9FF] text-[#0A0A0D] text-[9px] font-extrabold font-mono-numbers transition-transform ${
                    isCartPulsing ? 'scale-125' : 'scale-100'
                  }`}>
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-in Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-sm bg-[#0A0A0D] border-r border-[#2A2A32] h-full flex flex-col p-6 z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-6 border-b border-[#2A2A32]">
              <span className="font-display font-bold text-lg tracking-wider text-[#F5F5F7]">
                NYX<span className="text-[#8B5CF6]">DRIP</span>STORE
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[#9A9AA3] hover:text-[#F5F5F7]"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.view, link.category)}
                  className="text-left text-sm uppercase tracking-widest font-semibold py-2 text-[#C7CBD3] hover:text-white border-b border-[#2A2A32]/40"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-[#2A2A32] flex flex-col gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openSearchModal();
                }}
                className="flex items-center gap-3 py-2 text-sm text-[#9A9AA3] hover:text-white"
              >
                <Search size={18} />
                <span>Search Catalog</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('wishlist');
                }}
                className="flex items-center justify-between py-2 text-sm text-[#9A9AA3] hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <Heart size={18} />
                  <span>Wishlist</span>
                </div>
                {wishlistCount > 0 && (
                  <span className="font-mono-numbers text-xs text-[#8B5CF6] font-semibold">
                    {wishlistCount} items
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAccountModalOpen(true);
                }}
                className="flex items-center gap-3 py-2 text-sm text-[#9A9AA3] hover:text-white"
              >
                <User size={18} />
                <span>Account Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Info Modal */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setAccountModalOpen(false)}
          />
          <div className="relative bg-[#15151B] border border-[#2A2A32] p-6 max-w-md w-full shadow-2xl z-10">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A32]">
              <h3 className="font-display text-lg font-bold text-[#F5F5F7]">NYX VIP PASS</h3>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="text-[#9A9AA3] hover:text-[#F5F5F7]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="py-5 space-y-4">
              <div className="p-3 bg-[#0A0A0D] border border-[#2A2A32]">
                <p className="text-xs text-[#9A9AA3]">MEMBER STATUS</p>
                <p className="text-sm font-semibold text-[#F5F5F7] tracking-wider mt-0.5">TIER 1 · SHADOW OPERATOR</p>
              </div>
              <p className="text-xs text-[#9A9AA3] leading-relaxed">
                Unlock exclusive private drop access, member-only drops, order history tracking, and VIP coupons.
              </p>
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="Enter email for VIP access"
                  className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/60 focus:outline-none focus:border-[#8B5CF6]"
                  defaultValue="guest@nyxdrip.store"
                />
              </div>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold tracking-widest uppercase transition-colors"
              >
                Access My Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
