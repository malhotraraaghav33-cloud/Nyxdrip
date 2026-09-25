import React, { useState } from 'react';
import { X, Trash2, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../../context/NavigationContext';
import { QuantitySelector } from '../common/QuantitySelector';
import { PRODUCTS } from '../../data/products';
import { Magnetic } from '../common/Magnetic';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    closeCart,
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

  if (!isCartOpen) return null;

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

  const handleCheckout = () => {
    closeCart();
    navigateTo('checkout');
  };

  const recommendedItems = PRODUCTS.filter(
    (p) => !items.some((i) => i.product.id === p.id)
  ).slice(0, 3);

  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0A0A0D] border-l border-[#2A2A32] text-[#F5F5F7] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#2A2A32] flex items-center justify-between bg-[#15151B]">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold tracking-wider text-[#F5F5F7]">
                YOUR BAG
              </h2>
              <span className="text-xs text-[#9A9AA3] font-mono-numbers">
                ({items.reduce((s, i) => s + i.quantity, 0)})
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 text-[#9A9AA3] hover:text-[#F5F5F7] transition-colors focus-visible:outline-none"
              aria-label="Close cart"
            >
              <X size={20} />
            </button>
          </div>

          {/* Free Shipping Bar */}
          <div className="px-5 py-3 bg-[#15151B]/50 border-b border-[#2A2A32]">
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              {amountNeededForFreeShipping === 0 ? (
                <span className="text-[#00D9FF] font-semibold">✓ You've unlocked FREE Delivery</span>
              ) : (
                <span className="text-[#9A9AA3]">
                  Add <strong className="text-[#F5F5F7] font-mono-numbers">₹{amountNeededForFreeShipping}</strong> for FREE Delivery
                </span>
              )}
              <span className="font-mono-numbers text-[11px] text-[#9A9AA3]">{freeShippingProgress}%</span>
            </div>
            <div className="w-full h-1 bg-[#2A2A32] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#00D9FF] transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 rounded-full border border-[#2A2A32] flex items-center justify-center text-[#9A9AA3] mb-4">
                  <Tag size={24} />
                </div>
                <p className="font-display text-base font-bold text-[#F5F5F7]">Your bag is empty</p>
                <p className="text-xs text-[#9A9AA3] mt-1.5 max-w-xs">
                  Discover our dark streetwear collection and find your signature hardware pieces.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeCart();
                    navigateTo('shop');
                  }}
                  className="mt-6 px-6 py-2.5 bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6] text-xs font-bold tracking-widest uppercase transition-colors"
                >
                  Explore Drops
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A32]/60">
                {items.map((item) => (
                  <div key={`${item.product.id}-${item.selectedVariant}`} className="py-4 first:pt-0 flex gap-3.5">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-24 object-cover bg-[#15151B] border border-[#2A2A32] shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-[#F5F5F7] line-clamp-1">
                            {item.product.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id, item.selectedVariant)}
                            className="text-[#9A9AA3] hover:text-red-400 p-0.5 transition-colors"
                            aria-label={`Remove ${item.product.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {item.selectedVariant && (
                          <p className="text-[11px] text-[#9A9AA3] mt-0.5">
                            Variant: {item.selectedVariant}
                          </p>
                        )}
                        <p className="font-mono-numbers text-xs font-bold text-[#F5F5F7] mt-1.5">
                          ₹{item.product.price.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2">
                        <QuantitySelector
                          quantity={item.quantity}
                          max={item.product.stock}
                          onChange={(qty) => updateQuantity(item.product.id, item.selectedVariant, qty)}
                          size="sm"
                        />
                        <span className="font-mono-numbers text-xs text-[#C7CBD3]">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* In-Cart Quick Recommendation */}
            {items.length > 0 && recommendedItems.length > 0 && (
              <div className="pt-6 border-t border-[#2A2A32]">
                <p className="text-[11px] uppercase tracking-widest text-[#9A9AA3] font-semibold mb-3">
                  COMPLETE YOUR DRIP
                </p>
                <div className="space-y-2.5">
                  {recommendedItems.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 bg-[#15151B] border border-[#2A2A32] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rec.images[0]}
                          alt={rec.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover bg-[#0A0A0D]"
                        />
                        <div>
                          <p className="text-xs font-semibold text-[#F5F5F7] line-clamp-1">{rec.name}</p>
                          <p className="font-mono-numbers text-[11px] text-[#9A9AA3]">
                            ₹{rec.price.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(rec, 1)}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#0A0A0D] border border-[#2A2A32] hover:border-[#00D9FF] text-[#C7CBD3] hover:text-[#00D9FF] transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer & Checkout Callout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 bg-[#15151B] border-t border-[#2A2A32] space-y-3.5">
              {/* Coupon Form */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 bg-[#0A0A0D] border border-[#8B5CF6]/40 text-xs">
                    <div className="flex items-center gap-2 text-[#00D9FF]">
                      <Tag size={13} />
                      <span className="font-bold">{appliedCoupon.code}</span>
                      <span className="text-[#9A9AA3]">({appliedCoupon.discountPercent}% OFF)</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs text-[#9A9AA3] hover:text-white underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon code (NYX10, DRIP15)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#0A0A0D] border border-[#2A2A32] px-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/60 focus:outline-none focus:border-[#8B5CF6]"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-[#2A2A32] hover:bg-[#8B5CF6] text-white text-xs font-bold tracking-wider uppercase transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {couponError && (
                  <p className="text-[11px] text-red-400 mt-1">{couponError}</p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs">
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
                  <span>Estimated Shipping</span>
                  <span className="font-mono-numbers text-[#F5F5F7]">
                    {shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#2A2A32] flex justify-between font-bold text-sm text-[#F5F5F7]">
                  <span>Total</span>
                  <span className="font-mono-numbers text-base">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <Magnetic strength={10} className="w-full">
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={14} />
                </button>
              </Magnetic>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9A9AA3]">
                <ShieldCheck size={13} className="text-[#00D9FF]" />
                <span>256-Bit Encrypted Secure Checkout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
