import React from 'react';
import { useNavigation } from '../../context/NavigationContext';

export const Footer: React.FC = () => {
  const { navigateTo } = useNavigation();

  return (
    <footer className="bg-[#0A0A0D] border-t border-[#2A2A32] text-[#9A9AA3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Intro Column */}
          <div className="col-span-2 space-y-4">
            <button
              onClick={() => navigateTo('home')}
              className="text-left font-display text-xl font-bold tracking-widest text-[#F5F5F7] hover:text-white"
            >
              NYX<span className="text-[#8B5CF6]">DRIP</span>STORE
            </button>
            <p className="text-xs text-[#9A9AA3] leading-relaxed max-w-sm">
              Contemporary fashion accessories fusing Y2K nostalgia, dark gothic architecture, and cyber-minimalism. Handcrafted hardware engineered to outlast the night.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-[#C7CBD3]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
              <span>Free Pan-India Delivery on orders over ₹999</span>
            </div>
          </div>

          {/* Shop Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5F5F7] mb-4">Shop</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => navigateTo('shop')}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop', { category: 'Pendants' })}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Pendants
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop', { category: 'Bracelets' })}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Bracelets
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop', { category: 'Chains' })}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Chains
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop', { category: 'Rings' })}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Rings
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop', { category: 'Wallets' })}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Wallets
                </button>
              </li>
            </ul>
          </div>

          {/* Help Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5F5F7] mb-4">Help</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Contact & Support
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Shipping & Returns
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Jewelry Care Guide
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Ring Sizing Chart
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  Track Order
                </button>
              </li>
            </ul>
          </div>

          {/* Company & Social Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5F5F7] mb-4">Network</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => navigateTo('about')}
                  className="hover:text-[#F5F5F7] transition-colors"
                >
                  About Nyxdrip
                </button>
              </li>
              <li>
                <span className="hover:text-[#F5F5F7] cursor-pointer">Instagram @nyxdripstore</span>
              </li>
              <li>
                <span className="hover:text-[#F5F5F7] cursor-pointer">TikTok @nyxdrip</span>
              </li>
              <li>
                <span className="hover:text-[#F5F5F7] cursor-pointer">Pinterest @nyxdriparchive</span>
              </li>
              <li>
                <span className="hover:text-[#F5F5F7] cursor-pointer">YouTube @nyxdripstudios</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[#2A2A32] flex flex-col sm:flex-row items-center justify-between text-xs text-[#9A9AA3] gap-4">
          <p>© 2026 Nyxdripstore. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#F5F5F7] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#F5F5F7] cursor-pointer">Terms & Conditions</span>
            <span className="hover:text-[#F5F5F7] cursor-pointer">Sitemap</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
