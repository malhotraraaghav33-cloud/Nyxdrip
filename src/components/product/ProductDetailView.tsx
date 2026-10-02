import React, { useState, useEffect } from 'react';
import { Star, Truck, RefreshCw, ShieldCheck, ArrowLeft, ChevronDown, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { PRODUCTS } from '../../data/products';
import { useNavigation } from '../../context/NavigationContext';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fetchProductReviews, submitProductReview, ProductReview } from '../../services/reviewService';
import { WishlistButton } from '../common/WishlistButton';
import { QuantitySelector } from '../common/QuantitySelector';
import { ProductGrid } from './ProductGrid';
import { SwipeableGallery } from '../common/SwipeableGallery';
import { Magnetic } from '../common/Magnetic';
import { ScrollReveal } from '../common/ScrollReveal';

interface ProductDetailViewProps {
  slug?: string;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ slug }) => {
  const { params, navigateTo } = useNavigation();
  const { addToCart, openCart } = useCart();
  const { products } = useProducts();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const productSlug = slug || params.productId;
  const product = products.find((p) => p.slug === productSlug || p.id === productSlug) || products[0];

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(
    product?.variants?.options[0] || 'Standard'
  );
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('materials');

  // Sync selected variant when product changes
  useEffect(() => {
    if (product?.variants?.options[0]) {
      setSelectedVariant(product.variants.options[0]);
    } else {
      setSelectedVariant('Standard');
    }
    setSelectedImageIndex(0);
  }, [product?.id]);

  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Load reviews on product change
  useEffect(() => {
    if (product?.id) {
      setReviewsLoading(true);
      fetchProductReviews(product.id).then((revs) => {
        setReviews(revs);
        setReviewsLoading(false);
      });
    }
  }, [product?.id]);

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant);
    openCart();
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedVariant);
    navigateTo('checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Authentication Required', 'Please sign in to authenticate and submit your review.', 'info');
      navigateTo('account');
      return;
    }
    if (!newComment.trim()) {
      showToast('Review Required', 'Please write a brief comment describing your experience.', 'error');
      return;
    }

    setSubmittingReview(true);
    const authorName = profile?.full_name || user.email?.split('@')[0] || 'Verified Buyer';

    const res = await submitProductReview({
      productId: product.id,
      userId: user.id,
      userName: authorName,
      rating: newRating,
      comment: newComment.trim(),
    });

    setSubmittingReview(false);
    if (res.success) {
      showToast('Review Published', res.message, 'success');
      setNewComment('');
      // Refresh reviews
      const updated = await fetchProductReviews(product.id);
      setReviews(updated);
    } else {
      showToast('Submission Note', res.message, 'error');
    }
  };

  const relatedProducts = React.useMemo(() => {
    if (!product) return [];
    const sameCat = products.filter(
      (p) => p.category === product.category && p.id !== product.id && p.slug !== product.slug
    );
    if (sameCat.length < 4) {
      const remaining = products.filter(
        (p) => p.id !== product.id && p.slug !== product.slug && !sameCat.some((sc) => sc.slug === p.slug)
      );
      return [...sameCat, ...remaining].slice(0, 4);
    }
    return sameCat.slice(0, 4);
  }, [product, products]);

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-8 sm:py-12 pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigateTo('shop')}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#9A9AA3] hover:text-[#F5F5F7] mb-8 transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Catalog</span>
        </button>

        {/* Product Purchase Module (Contiguous Layout per reference Section 2.A) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
          {/* Left Column: Swipe-Friendly Image Gallery */}
          <div className="lg:col-span-7">
            <SwipeableGallery
              images={product.images}
              productName={product.name}
              badge={product.badge}
              selectedIndex={selectedImageIndex}
              onSelectIndex={setSelectedImageIndex}
            />
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Category & Style */}
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8B5CF6] font-semibold mb-2">
                <span>{product.category}</span>
                {product.style && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{product.style} Aesthetic</span>
                  </>
                )}
              </div>

              {/* Title */}
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#F5F5F7]">
                {product.name}
              </h1>

              {/* Rating & Stock Status (neutral when unrated) */}
              <div className="mt-3 flex items-center gap-4 text-xs">
                {typeof product.rating === 'number' && product.rating > 0 ? (
                  <div className="flex items-center gap-1.5 text-[#F5F5F7]">
                    <div className="flex items-center text-[#8B5CF6]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          className={i < Math.floor(product.rating || 0) ? 'fill-[#8B5CF6]' : 'text-[#2A2A32]'}
                        />
                      ))}
                    </div>
                    <span className="font-mono-numbers font-bold">{product.rating.toFixed(1)}</span>
                    {product.reviewCount ? (
                      <span className="text-[#9A9AA3]">({product.reviewCount} customer reviews)</span>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-[11px] text-[#9A9AA3] uppercase tracking-wider font-mono-numbers">
                    NYx Hardware Capsule Drop
                  </span>
                )}
              </div>

              {/* Price Banner */}
              <div className="mt-6 p-4 bg-[#15151B] border border-[#2A2A32] flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-3">
                    {product.priceIsPlaceholder || product.price === 0 ? (
                      <span className="font-mono-numbers text-xl sm:text-2xl font-bold text-[#8B5CF6] uppercase tracking-wider">
                        Price On Request
                      </span>
                    ) : (
                      <>
                        <span className="font-mono-numbers text-2xl sm:text-3xl font-bold text-[#F5F5F7]">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="font-mono-numbers text-sm text-[#9A9AA3] line-through">
                            ₹{product.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                        {discountPercent > 0 && (
                          <span className="px-2 py-0.5 bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30 text-xs font-bold">
                            Save {discountPercent}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9A9AA3] mt-1">Inclusive of all taxes · Free pan-India shipping on ₹999+</p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-[#00D9FF]">
                    In Stock · Ready to Dispatch
                  </span>
                </div>
              </div>

              {/* Short Description */}
              <p className="mt-6 text-xs sm:text-sm text-[#9A9AA3] leading-relaxed">
                {product.description}
              </p>

              {/* Variants Selector */}
              {product.variants && (
                <div className="mt-6 space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-[#F5F5F7]">
                      {product.variants.name}: <span className="font-normal text-[#9A9AA3]">{selectedVariant}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.options.map((option) => {
                      const isSelected = selectedVariant === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedVariant(option)}
                          className={`px-3 py-2 text-xs border font-medium transition-all ${
                            isSelected
                              ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-sm'
                              : 'bg-[#15151B] border-[#2A2A32] text-[#9A9AA3] hover:text-[#F5F5F7] hover:border-[#C7CBD3]/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity & Actions */}
              <div className="mt-8 space-y-3.5">
                <div className="flex items-center gap-3">
                  <QuantitySelector
                    quantity={quantity}
                    max={product.stock}
                    onChange={setQuantity}
                  />
                  <div className="flex-1">
                    <Magnetic strength={12} className="w-full">
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-lg active:scale-95"
                      >
                        Add to Bag
                      </button>
                    </Magnetic>
                  </div>
                  <WishlistButton product={product} size="lg" />
                </div>

                <Magnetic strength={12} className="w-full">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full py-3 bg-[#15151B] hover:bg-[#202029] border border-[#2A2A32] hover:border-[#00D9FF] text-[#00D9FF] text-xs font-bold uppercase tracking-widest transition-colors active:scale-95"
                  >
                    Buy Now With 1-Click
                  </button>
                </Magnetic>
              </div>

              {/* Accordion Specs & Trust Details */}
              <div className="mt-8 divide-y divide-[#2A2A32] border-y border-[#2A2A32] text-xs">
                {/* Materials & Specs */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('materials')}
                    className="w-full py-3.5 flex items-center justify-between font-bold uppercase tracking-wider text-[#F5F5F7]"
                  >
                    <span>Materials & Craftsmanship</span>
                    <ChevronDown
                      size={15}
                      className={`text-[#9A9AA3] transition-transform duration-200 ${
                        activeAccordion === 'materials' ? 'rotate-180 text-[#8B5CF6]' : ''
                      }`}
                    />
                  </button>
                  {activeAccordion === 'materials' && (
                    <div className="pb-4 text-[#9A9AA3] space-y-2 animate-in fade-in duration-200">
                      <p>{product.materials}</p>
                      <p className="text-[11px] text-[#C7CBD3]">Finish: {product.color} Electroplate</p>
                    </div>
                  )}
                </div>

                {/* Care Guide */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('care')}
                    className="w-full py-3.5 flex items-center justify-between font-bold uppercase tracking-wider text-[#F5F5F7]"
                  >
                    <span>Care Instructions</span>
                    <ChevronDown
                      size={15}
                      className={`text-[#9A9AA3] transition-transform duration-200 ${
                        activeAccordion === 'care' ? 'rotate-180 text-[#8B5CF6]' : ''
                      }`}
                    />
                  </button>
                  {activeAccordion === 'care' && (
                    <div className="pb-4 text-[#9A9AA3] animate-in fade-in duration-200">
                      <p>{product.careInstructions}</p>
                    </div>
                  )}
                </div>

                {/* Delivery & Returns */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('shipping')}
                    className="w-full py-3.5 flex items-center justify-between font-bold uppercase tracking-wider text-[#F5F5F7]"
                  >
                    <span>Shipping & Hassle-Free Returns</span>
                    <ChevronDown
                      size={15}
                      className={`text-[#9A9AA3] transition-transform duration-200 ${
                        activeAccordion === 'shipping' ? 'rotate-180 text-[#8B5CF6]' : ''
                      }`}
                    />
                  </button>
                  {activeAccordion === 'shipping' && (
                    <div className="pb-4 text-[#9A9AA3] space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-[#00D9FF]" />
                        <span>Dispatched within 24 hours. Delivered in 3-5 business days across India.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshCw size={14} className="text-[#8B5CF6]" />
                        <span>7-day replacement guarantee if size or finish doesn't match your fit.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-[#C7CBD3]" />
                        <span>Lifetime anti-tarnish guarantee against corrosion and rust.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Reviews & Feedback */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('reviews')}
                    className="w-full py-3.5 flex items-center justify-between font-bold uppercase tracking-wider text-[#F5F5F7]"
                  >
                    <div className="flex items-center gap-2">
                      <span>Customer Reviews ({reviews.length > 0 ? reviews.length : (product.reviewCount ?? 0)})</span>
                      {product.rating ? (
                        <span className="text-[11px] text-[#8B5CF6]">★ {product.rating.toFixed(1)}</span>
                      ) : null}
                    </div>
                    <ChevronDown
                      size={15}
                      className={`text-[#9A9AA3] transition-transform duration-200 ${
                        activeAccordion === 'reviews' ? 'rotate-180 text-[#8B5CF6]' : ''
                      }`}
                    />
                  </button>
                  {activeAccordion === 'reviews' && (
                    <div className="pb-6 text-xs text-[#9A9AA3] space-y-4 animate-in fade-in duration-200">
                      {/* Review List */}
                      {reviewsLoading ? (
                        <p className="text-xs text-[#9A9AA3] py-2">Querying verified reviews...</p>
                      ) : reviews.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {reviews.map((rev) => (
                            <div key={rev.id} className="p-3 bg-[#0A0A0D] border border-[#2A2A32] space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[#F5F5F7] text-xs">{rev.userName}</span>
                                <div className="flex items-center text-[#8B5CF6]">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={11}
                                      className={i < rev.rating ? 'fill-[#8B5CF6]' : 'text-[#2A2A32]'}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-[#C7CBD3] text-xs leading-relaxed">{rev.comment}</p>
                              <span className="text-[10px] text-[#9A9AA3] font-mono-numbers block">
                                Verified Purchase · {new Date(rev.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#9A9AA3] italic">
                          Be the first verified customer to submit a review for this piece.
                        </p>
                      )}

                      {/* Write Review Form */}
                      <form onSubmit={handleReviewSubmit} className="pt-3 border-t border-[#2A2A32] space-y-3">
                        <span className="font-bold text-[#F5F5F7] uppercase tracking-wider block text-xs">
                          Leave Verified Feedback
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9A9AA3]">Rating:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewRating(star)}
                                className="p-0.5 text-[#8B5CF6] hover:scale-110 transition-transform"
                              >
                                <Star
                                  size={16}
                                  className={star <= newRating ? 'fill-[#8B5CF6]' : 'text-[#2A2A32]'}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={user ? "Describe the weight, finish, or fit..." : "Sign in to authenticate your review..."}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] p-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/60 focus:outline-none focus:border-[#8B5CF6]"
                        />

                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="w-full py-2 bg-[#15151B] hover:bg-[#8B5CF6] border border-[#2A2A32] hover:border-[#8B5CF6] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Send size={12} />
                          <span>{submittingReview ? 'Authenticating...' : 'Submit Review'}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <ScrollReveal animation="fade-up" delay={100}>
            <div className="mt-24 pt-16 border-t border-[#2A2A32]">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#8B5CF6] font-semibold mb-1">
                    MATCHING HARDWARE
                  </p>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F5F5F7]">
                    YOU MAY ALSO LIKE
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('shop', { category: product.category })}
                  className="text-xs font-bold uppercase tracking-wider text-[#9A9AA3] hover:text-[#00D9FF] transition-colors"
                >
                  More in {product.category} →
                </button>
              </div>
              <ProductGrid products={relatedProducts} columns={4} />
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* Mobile Sticky Bottom Purchase Bar (Section 2.A: Price + Add to Cart) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 p-3 bg-[#0A0A0D]/95 backdrop-blur-md border-t border-[#2A2A32] flex items-center justify-between gap-4">
        <div>
          <span className="font-mono-numbers text-base font-bold text-[#F5F5F7]">
            {product.priceIsPlaceholder || product.price === 0
              ? 'Price On Request'
              : `₹${product.price.toLocaleString('en-IN')}`}
          </span>
          <span className="block text-[10px] text-[#9A9AA3] truncate max-w-[120px]">
            {selectedVariant}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <WishlistButton product={product} size="md" />
          <button
            type="button"
            onClick={handleAddToCart}
            className="px-6 py-2.5 bg-[#8B5CF6] text-white text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
          >
            Add to Bag
          </button>
        </div>
      </div>
    </div>
  );
};
