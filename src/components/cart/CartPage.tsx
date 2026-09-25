import React, { useState } from 'react';
import { Trash2, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../../context/NavigationContext';
import { QuantitySelector } from '../common/QuantitySelector';
import { PRODUCTS } from '../../data/products';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';

export const CartPage: React.FC = () => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    discount,
    shipping,
    total,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    amountNeededForFreeShipping,
    freeShippingThreshold,
    addToCart,
  } = useCart();

  const { navigateTo } = useNavigation();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponError('');
      setCouponInput('');
    }
  };

  const recommendedItems = PRODUCTS.filter(
    (p) => !items.some((i) => i.product.id === p.id)
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="pb-8 border-b border-[#2A2A32]">
            <span className="text-xs uppercase tracking-[0.25em] text-[#8B5CF6] font-semibold">
              SHOPPING CART
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase mt-1">
              REVIEW YOUR BAG ({items.reduce((s, i) => s + i.quantity, 0)})
            </h1>
          </div>
        </ScrollReveal>

        {items.length === 0 ? (
          <div className="py-24 text-center border border-[#2A2A32] bg-[#15151B] mt-8 p-8 animate-in fade-in duration-300">
            <h3 className="font-display text-lg font-bold text-[#F5F5F7]">
              YOUR BAG IS CURRENTLY EMPTY
            </h3>
            <p className="text-xs text-[#9A9AA3] mt-2 max-w-sm mx-auto">
              Ready to gear up? Explore our chrome cross pendants, spiked cuffs, and gothic rings.
            </p>
            <div className="mt-6 flex justify-center">
              <Magnetic strength={12}>
                <button
                  type="button"
                  onClick={() => navigateTo('shop')}
                  className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
                >
                  Explore Drops
                </button>
              </Magnetic>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-4">
              {/* Free delivery prompt */}
              <div className="p-4 bg-[#15151B] border border-[#2A2A32] text-xs">
                {amountNeededForFreeShipping === 0 ? (
                  <span className="text-[#00D9FF] font-semibold animate-pulse">
                    ✓ You qualify for FREE Pan-India Delivery
                  </span>
                ) : (
                  <span className="text-[#9A9AA3]">
                    Add <strong className="text-[#F5F5F7] font-mono-numbers">₹{amountNeededForFreeShipping}</strong> more to qualify for FREE Shipping (Threshold: ₹{freeShippingThreshold})
                  </span>
                )}
              </div>

              <div className="border border-[#2A2A32] bg-[#15151B] divide-y divide-[#2A2A32]">
                {items.map((item, idx) => (
                  <ScrollReveal key={`${item.product.id}-${item.selectedVariant}`} animation="fade-up" delay={idx * 60}>
                    <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 group hover:bg-[#101015] transition-colors">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-24 h-28 object-cover bg-[#0A0A0D] border border-[#2A2A32] shrink-0 group-hover:scale-102 transition-transform"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#9A9AA3]">
                              {item.product.category} · {item.product.style}
                            </span>
                            <h3 className="font-semibold text-sm sm:text-base text-[#F5F5F7] mt-0.5">
                              {item.product.name}
                            </h3>
                            {item.selectedVariant && (
                              <p className="text-xs text-[#9A9AA3] mt-1">
                                Variant: {item.selectedVariant}
                              </p>
                            )}
                          </div>
                          <span className="font-mono-numbers text-sm sm:text-base font-bold text-[#F5F5F7]">
                            ₹{item.product.price.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#2A2A32]/60 flex items-center justify-between">
                        <QuantitySelector
                          quantity={item.quantity}
                          max={item.product.stock}
                          onChange={(qty) => updateQuantity(item.product.id, item.selectedVariant, qty)}
                        />
                        <div className="flex items-center gap-4">
                          <span className="font-mono-numbers text-xs text-[#C7CBD3]">
                            Line Total: ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id, item.selectedVariant)}
                            className="p-1.5 text-[#9A9AA3] hover:text-red-400 transition-colors"
                            aria-label={`Remove ${item.product.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
              </div>
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-4">
              <ScrollReveal animation="slide-left" delay={150}>
                <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-6">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7] pb-3 border-b border-[#2A2A32]">
                    Order Summary
                  </h2>

                  {/* Coupon input */}
                  <div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-2.5 bg-[#0A0A0D] border border-[#8B5CF6]/50 text-xs">
                        <div className="flex items-center gap-2 text-[#00D9FF]">
                          <Tag size={14} />
                          <span className="font-bold">{appliedCoupon.code}</span>
                          <span className="text-[#9A9AA3]">({appliedCoupon.discountPercent}% OFF)</span>
                        </div>
                        <button
                          type="button"
                          onClick={removeCoupon}
                          className="text-[#9A9AA3] hover:text-white underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Coupon Code"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          className="flex-1 bg-[#0A0A0D] border border-[#2A2A32] px-3 py-2 text-xs text-[#F5F5F7] placeholder-[#9A9AA3] focus:outline-none focus:border-[#8B5CF6]"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#2A2A32] hover:bg-[#8B5CF6] text-white text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
                        >
                          Apply
                        </button>
                      </form>
                    )}
                    {couponError && <p className="text-[11px] text-red-400 mt-1">{couponError}</p>}
                  </div>

                  {/* Cost Rows */}
                  <div className="space-y-2 text-xs border-t border-[#2A2A32] pt-4">
                    <div className="flex justify-between text-[#9A9AA3]">
                      <span>Subtotal</span>
                      <span className="font-mono-numbers text-[#F5F5F7]">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-[#00D9FF]">
                        <span>Discount</span>
                        <span className="font-mono-numbers">-₹{discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#9A9AA3]">
                      <span>Shipping</span>
                      <span className="font-mono-numbers text-[#F5F5F7]">
                        {shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-[#2A2A32] flex justify-between font-bold text-base text-[#F5F5F7]">
                      <span>Total</span>
                      <span className="font-mono-numbers text-lg">₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <Magnetic strength={10} className="w-full">
                    <button
                      type="button"
                      onClick={() => navigateTo('checkout')}
                      className="w-full py-3.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight size={14} />
                    </button>
                  </Magnetic>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9A9AA3] pt-2">
                    <ShieldCheck size={13} className="text-[#00D9FF]" />
                    <span>256-Bit Encrypted Secure Checkout</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* You may also like */}
        {items.length > 0 && recommendedItems.length > 0 && (
          <ScrollReveal animation="fade-up" delay={200}>
            <div className="mt-20 pt-12 border-t border-[#2A2A32]">
              <h3 className="font-display text-lg font-bold uppercase tracking-wider mb-6 text-[#F5F5F7]">
                Complete Your Fit
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recommendedItems.map((rec) => (
                  <div key={rec.id} className="p-3 bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6]/50 flex flex-col justify-between transition-colors group">
                    <img
                      src={rec.images[0]}
                      alt={rec.name}
                      referrerPolicy="no-referrer"
                      className="aspect-square object-cover mb-2 group-hover:scale-103 transition-transform"
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-[#F5F5F7] line-clamp-1">{rec.name}</h4>
                      <span className="font-mono-numbers text-xs text-[#C7CBD3] font-bold">
                        ₹{rec.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(rec, 1)}
                      className="mt-3 w-full py-1.5 bg-[#0A0A0D] border border-[#2A2A32] hover:border-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white text-[10px] font-bold uppercase tracking-wider text-[#F5F5F7] transition-all active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
};
