export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: 'Pendants' | 'Bracelets' | 'Chains' | 'Rings' | 'Wallets' | 'Accessories';
  description: string;
  images: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  tags: string[];
  badge?: 'NEW' | 'BESTSELLER' | 'LIMITED' | null;
  style: 'Gothic' | 'Y2K' | 'Cyber' | 'Industrial' | 'Minimalist';
  color: 'Silver' | 'Obsidian' | 'Chrome' | 'Gunmetal';
  materials: string;
  careInstructions: string;
  variants?: {
    name: string; // e.g. "Length" or "Ring Size"
    options: string[]; // e.g. ["50cm", "60cm"] or ["US 7", "US 8", "US 9", "US 10"]
  };
  isNewArrival?: boolean;
  isBestSeller?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface WishlistItem {
  product: Product;
  addedAt: string;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  description: string;
  minOrderAmount?: number;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled';

export interface CustomerInfo {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Order {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  customer: CustomerInfo;
  deliveryMethod: 'standard' | 'express';
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallets' | 'paypal';
  status: OrderStatus;
  createdAt: string;
  estimatedDelivery: string;
}

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'popular';

export interface FilterState {
  searchQuery: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  color: string;
  inStockOnly: boolean;
  minRating: number;
  style: string;
  newArrivalsOnly: boolean;
  bestSellersOnly: boolean;
}
