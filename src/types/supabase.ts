export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: 'customer' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin';
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          price: number;
          original_price: number | null;
          category_id: string | null;
          category_name: string;
          style: string;
          colors: string[];
          materials: string | null;
          care_instructions: string | null;
          rating: number;
          review_count: number;
          stock: number;
          badge: string | null;
          images: string[];
          variants: Json | null;
          tags: string[];
          is_active: boolean;
          is_new_arrival: boolean;
          is_best_seller: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description: string;
          price: number;
          original_price?: number | null;
          category_id?: string | null;
          category_name: string;
          style?: string;
          colors?: string[];
          materials?: string | null;
          care_instructions?: string | null;
          rating?: number;
          review_count?: number;
          stock?: number;
          badge?: string | null;
          images?: string[];
          variants?: Json | null;
          tags?: string[];
          is_active?: boolean;
          is_new_arrival?: boolean;
          is_best_seller?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string;
          price?: number;
          original_price?: number | null;
          category_id?: string | null;
          category_name?: string;
          style?: string;
          colors?: string[];
          materials?: string | null;
          care_instructions?: string | null;
          rating?: number;
          review_count?: number;
          stock?: number;
          badge?: string | null;
          images?: string[];
          variants?: Json | null;
          tags?: string[];
          is_active?: boolean;
          is_new_arrival?: boolean;
          is_best_seller?: boolean;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          low_stock_threshold: number;
          allow_backorder: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity?: number;
          low_stock_threshold?: number;
          allow_backorder?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity?: number;
          low_stock_threshold?: number;
          allow_backorder?: boolean;
          updated_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          selected_variant: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity?: number;
          selected_variant?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          quantity?: number;
          selected_variant?: string | null;
          updated_at?: string;
        };
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          street_address: string;
          apartment: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          street_address: string;
          apartment?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          phone?: string;
          street_address?: string;
          apartment?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          is_default?: boolean;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          customer_email: string;
          customer_phone: string;
          customer_name: string;
          shipping_address: Json;
          delivery_method: string;
          payment_method: string;
          payment_status: 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled';
          order_status: 'Pending' | 'Processing' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';
          subtotal: number;
          discount: number;
          shipping: number;
          total: number;
          coupon_code: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id?: string | null;
          customer_email: string;
          customer_phone: string;
          customer_name: string;
          shipping_address: Json;
          delivery_method?: string;
          payment_method?: string;
          payment_status?: 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled';
          order_status?: 'Pending' | 'Processing' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';
          subtotal: number;
          discount?: number;
          shipping?: number;
          total: number;
          coupon_code?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          customer_email?: string;
          customer_phone?: string;
          customer_name?: string;
          shipping_address?: Json;
          delivery_method?: string;
          payment_method?: string;
          payment_status?: 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled';
          order_status?: 'Pending' | 'Processing' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';
          subtotal?: number;
          discount?: number;
          shipping?: number;
          total?: number;
          coupon_code?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_slug: string;
          price_snapshot: number;
          quantity: number;
          selected_variant: string | null;
          product_image: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_slug: string;
          price_snapshot: number;
          quantity: number;
          selected_variant?: string | null;
          product_image?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_slug?: string;
          price_snapshot?: number;
          quantity?: number;
          selected_variant?: string | null;
          product_image?: string | null;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_percent: number;
          description: string;
          min_order_amount: number;
          max_discount_amount: number | null;
          max_uses: number | null;
          usage_count: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_percent: number;
          description: string;
          min_order_amount?: number;
          max_discount_amount?: number | null;
          max_uses?: number | null;
          usage_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_percent?: number;
          description?: string;
          min_order_amount?: number;
          max_discount_amount?: number | null;
          max_uses?: number | null;
          usage_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          user_name: string;
          rating: number;
          comment: string;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          user_name: string;
          rating: number;
          comment: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          user_name?: string;
          rating?: number;
          comment?: string;
          status?: 'pending' | 'approved' | 'rejected';
        };
      };
    };
  };
}
