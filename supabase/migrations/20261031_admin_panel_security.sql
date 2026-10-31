-- ============================================================================
-- NYXDRIP ARCHIVE - PRODUCTION ADDITIVE SCHEMA & SECURITY MIGRATION
-- File: /supabase/migrations/20261031_admin_panel_security.sql
-- 
-- DESCRIPTION:
-- Additive, non-destructive migration for Supabase databases that already have
-- `products`, `inventory`, `carts`, and `cart_items`, but are missing:
--   - profiles
--   - orders
--   - order_items
--
-- NOTE: Per instruction, `categories` table is NOT created because the existing
-- application stores categorization directly on `products.category_name` and
-- storefront views use static `CATEGORIES_DATA` with automatic graceful fallback.
--
-- HOW TO RUN:
-- Open your Supabase Dashboard -> SQL Editor -> New Query.
-- Paste this entire script and click "Run".
-- Safe & Idempotent: Does NOT delete or overwrite existing products or cart items.
-- ============================================================================

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CREATE MISSING TABLE: public.profiles
-- Securely associates user profile data with Supabase auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all expected columns exist even if profiles partially existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Performance indexes on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Backfill any existing users in auth.users who don't have a profile row yet
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(COALESCE(u.email, ''), '@', 1)),
  'customer'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. HARDENED IS_ADMIN() FUNCTION
-- Explicit, secure admin verification with safe search_path and no 'postgres' bypass
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Service role JWT (backend processes) is trusted
  IF NULLIF(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- 2. Immediate false if caller is unauthenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. Check public.profiles for verified 'admin' role
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Restrict execution permissions to authenticated callers and service role
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- ============================================================================
-- 3. USER REGISTRATION TRIGGER (PREVENT CUSTOMER SELF-ELEVATION)
-- Every newly registered user in auth.users is unconditionally assigned 'customer'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    'customer' -- IMMUTABLE: Always force 'customer'. Ignores client metadata!
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. PROFILE ROLE PROTECTION TRIGGER
-- Blocks non-admins from changing the 'role' column on public.profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  v_jwt_role := NULLIF(current_setting('request.jwt.claim.role', true), '');

  -- If role is being changed:
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow service_role
    IF v_jwt_role = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Caller MUST already be an authenticated admin
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only verified administrators can alter account roles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- ============================================================================
-- 5. PRIVILEGED SERVER-SIDE PROCEDURES FOR ADMIN ROLE ASSIGNMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  v_jwt_role := NULLIF(current_setting('request.jwt.claim.role', true), '');

  IF NOT public.is_admin() AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Administrator clearance required to assign admin role.';
  END IF;

  UPDATE public.profiles
  SET role = 'admin', updated_at = timezone('utc'::text, now())
  WHERE lower(trim(email)) = lower(trim(target_email));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for email: %', target_email;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_admin_role(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_admin_role(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.revoke_admin_role(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  v_jwt_role := NULLIF(current_setting('request.jwt.claim.role', true), '');

  IF NOT public.is_admin() AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Administrator clearance required to revoke admin role.';
  END IF;

  -- Prevent self-lockout
  IF lower(trim(target_email)) = lower(trim((SELECT email FROM public.profiles WHERE id = auth.uid()))) THEN
    RAISE EXCEPTION 'Prohibited: You cannot revoke your own administrator role.';
  END IF;

  UPDATE public.profiles
  SET role = 'customer', updated_at = timezone('utc'::text, now())
  WHERE lower(trim(email)) = lower(trim(target_email));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for email: %', target_email;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_admin_role(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_admin_role(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_admin_role(TEXT) TO authenticated, service_role;

-- ============================================================================
-- 6. CREATE MISSING TABLE: public.orders
-- Complete e-commerce order record supporting authenticated & guest checkouts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  guest_access_token TEXT,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_method TEXT NOT NULL DEFAULT 'standard',
  payment_method TEXT NOT NULL DEFAULT 'Prepaid',
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Processing', 'Paid', 'Failed', 'Cancelled')),
  order_status TEXT NOT NULL DEFAULT 'Processing' CHECK (order_status IN ('Pending', 'Processing', 'Paid', 'Shipped', 'Delivered', 'Cancelled')),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  shipping NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (shipping >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  coupon_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all expected columns exist if table was partially created
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'Prepaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_status TEXT NOT NULL DEFAULT 'Processing';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Indexes for orders performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_guest_access_token ON public.orders(guest_access_token) WHERE guest_access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);

-- ============================================================================
-- 7. CREATE MISSING TABLE: public.order_items
-- Line item snapshots tied to orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  price_snapshot NUMERIC(10, 2) NOT NULL CHECK (price_snapshot >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  selected_variant TEXT DEFAULT 'Standard',
  product_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all expected columns exist if table was partially created
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_slug TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_variant TEXT DEFAULT 'Standard';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_image TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ============================================================================
-- 8. PRESERVATION & ADDITIVE CHECKS FOR EXISTING TABLES
-- (products, inventory, carts, cart_items)
-- Safe: Only adds missing helper columns if not already present; never modifies rows
-- ============================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 20;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT ARRAY['Silver']::TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'Gothic';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS materials TEXT DEFAULT '316L Surgical Stainless Steel';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS care_instructions TEXT DEFAULT 'Hypoallergenic and sweatproof.';

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 5;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS product_key TEXT;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ============================================================================
-- 9. FINANCIAL INTEGRITY & PRICE VALIDATION TRIGGERS
-- Do not trust client-supplied prices: database queries real catalog prices!
-- Keep Razorpay integration disabled: orders cannot be marked 'Paid' by clients.
-- ============================================================================

-- A. Server-Side Price Lookup & Snapshot Trigger on order_items
CREATE OR REPLACE FUNCTION public.validate_order_item_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_real_price NUMERIC;
  v_prod_name TEXT;
  v_prod_slug TEXT;
  v_prod_images TEXT[];
BEGIN
  -- 1. Clamp quantity to positive integer
  IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
    NEW.quantity := 1;
  END IF;

  -- 2. Lookup real price from public.products by UUID/TEXT ID or by slug
  SELECT price, name, slug, images
  INTO v_real_price, v_prod_name, v_prod_slug, v_prod_images
  FROM public.products
  WHERE id::text = NEW.product_id OR slug = NEW.product_slug
  LIMIT 1;

  -- If found in products catalog, OVERWRITE client-supplied price with the server price!
  IF v_real_price IS NOT NULL THEN
    NEW.price_snapshot := v_real_price;
    NEW.product_name := COALESCE(v_prod_name, NEW.product_name);
    NEW.product_slug := COALESCE(v_prod_slug, NEW.product_slug);
    IF (NEW.product_image IS NULL OR NEW.product_image = '') AND v_prod_images IS NOT NULL AND array_length(v_prod_images, 1) > 0 THEN
      NEW.product_image := v_prod_images[1];
    END IF;
  ELSE
    -- If product was not found in table, enforce price_snapshot >= 0
    IF NEW.price_snapshot IS NULL OR NEW.price_snapshot < 0 THEN
      RAISE EXCEPTION 'Invalid price for order item: %', NEW.product_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_item_financials ON public.order_items;
CREATE TRIGGER trg_validate_order_item_financials
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_item_financials();

-- B. Order Integrity & Razorpay Lockdown Trigger on orders
CREATE OR REPLACE FUNCTION public.enforce_order_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  v_jwt_role := NULLIF(current_setting('request.jwt.claim.role', true), '');

  -- On INSERT:
  IF TG_OP = 'INSERT' THEN
    -- If caller is authenticated, enforce user_id matches auth.uid()
    IF auth.uid() IS NOT NULL THEN
      NEW.user_id := auth.uid();
    END IF;

    -- ALWAYS force payment_status to 'Pending' on checkout creation (never trust client)
    NEW.payment_status := 'Pending';

    -- Non-negative totals
    IF NEW.subtotal < 0 OR NEW.discount < 0 OR NEW.shipping < 0 OR NEW.total < 0 THEN
      RAISE EXCEPTION 'Order monetary values cannot be negative.';
    END IF;

    NEW.created_at := COALESCE(NEW.created_at, timezone('utc'::text, now()));
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  -- On UPDATE:
  IF TG_OP = 'UPDATE' THEN
    -- 1. Monetary totals are immutable after placement (unless service_role)
    IF (NEW.total IS DISTINCT FROM OLD.total OR
        NEW.subtotal IS DISTINCT FROM OLD.subtotal OR
        NEW.discount IS DISTINCT FROM OLD.discount OR
        NEW.shipping IS DISTINCT FROM OLD.shipping) AND v_jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'Security Violation: Order monetary calculations are immutable once created.';
    END IF;

    -- 2. Order number cannot be modified
    IF NEW.order_number IS DISTINCT FROM OLD.order_number THEN
      RAISE EXCEPTION 'Security Violation: Order numbers cannot be altered.';
    END IF;

    -- 3. Razorpay lockdown: Disallow setting payment_status to 'Paid' from any client or admin dashboard.
    -- Marking 'Paid' is strictly reserved for the future backend payment webhook using service_role.
    IF NEW.payment_status = 'Paid' AND OLD.payment_status <> 'Paid' AND v_jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'Security Violation: Manual payment verification is disabled. Orders cannot be marked Paid until the payment gateway webhook is active.';
    END IF;

    -- 4. If an order is already marked 'Paid', clients cannot alter it
    IF OLD.payment_status = 'Paid' AND NEW.payment_status <> 'Paid' AND v_jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'Security Violation: Verified payment records cannot be modified.';
    END IF;

    -- 5. Non-admins cannot alter order_status
    IF NEW.order_status IS DISTINCT FROM OLD.order_status AND NOT public.is_admin() AND v_jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can update fulfillment status.';
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_integrity ON public.orders;
CREATE TRIGGER trg_enforce_order_integrity
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_integrity();

-- ============================================================================
-- 10. GUEST ORDER RETRIEVAL RPC: get_guest_order()
-- Secure lookup using order_number + guest_access_token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_guest_order(
  p_order_number TEXT,
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
BEGIN
  IF p_order_number IS NULL OR trim(p_order_number) = '' OR p_token IS NULL OR trim(p_token) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE order_number = trim(p_order_number)
    AND guest_access_token = trim(p_token);

  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'product_id', oi.product_id,
    'product_name', oi.product_name,
    'product_slug', oi.product_slug,
    'price_snapshot', oi.price_snapshot,
    'quantity', oi.quantity,
    'selected_variant', oi.selected_variant,
    'product_image', oi.product_image
  )) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'customer_phone', v_order.customer_phone,
    'shipping_address', v_order.shipping_address,
    'delivery_method', v_order.delivery_method,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'subtotal', v_order.subtotal,
    'discount', v_order.discount,
    'shipping', v_order.shipping,
    'total', v_order.total,
    'created_at', v_order.created_at,
    'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_order(TEXT, TEXT) TO anon, authenticated, service_role;

-- ============================================================================
-- 11. AUDITED ROW LEVEL SECURITY POLICIES (NO CONFLICTS, LEAST PRIVILEGE)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users and admins read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;

CREATE POLICY "Users and admins read profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- PRODUCTS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Admins insert products" ON public.products;
DROP POLICY IF EXISTS "Admins update products" ON public.products;
DROP POLICY IF EXISTS "Admins delete products" ON public.products;
DROP POLICY IF EXISTS "Admins manage products" ON public.products;

CREATE POLICY "Public read products" ON public.products
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins update products" ON public.products
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete products" ON public.products
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- INVENTORY RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins manage inventory" ON public.inventory;

CREATE POLICY "Public read inventory" ON public.inventory
  FOR SELECT USING (true);

CREATE POLICY "Admins manage inventory" ON public.inventory
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- CARTS & CART ITEMS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own cart" ON public.carts;
DROP POLICY IF EXISTS "Admins read carts" ON public.carts;

CREATE POLICY "Users manage own cart" ON public.carts
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own cart items" ON public.cart_items;

CREATE POLICY "Users manage own cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
      AND (carts.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
      AND (carts.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ----------------------------------------------------------------------------
-- ORDERS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users and Guests create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;

-- Customers see their own orders; Admins see all orders
CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Authenticated customers & Guests can create new orders during checkout
CREATE POLICY "Users and Guests create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only Admins can update orders (e.g. tracking / fulfillment notes)
CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Only Admins can delete orders
CREATE POLICY "Admins delete orders" ON public.orders
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- ORDER ITEMS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;

CREATE POLICY "Users view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Insert order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
    )
  );

CREATE POLICY "Admins manage order items" ON public.order_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 12. SUPABASE STORAGE BUCKET: 'products'
-- Ensures CDN bucket exists and is publicly readable, with admin-only uploads
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;

CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Admins upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Admins update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Admins delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'products' AND public.is_admin());

-- ============================================================================
-- 13. BOOTSTRAP: PROMOTE YOUR ACCOUNT TO ADMIN
-- After running this migration, run the following line with your email in SQL Editor:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE lower(email) = lower('manishmalhotra953@gmail.com');
-- ============================================================================
