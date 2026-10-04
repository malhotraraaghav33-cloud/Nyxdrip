-- ============================================================================
-- NYX DRIPSTORE - GUEST CHECKOUT & SECURE ORDER SYSTEM MIGRATION
-- Migration: 20261003_guest_checkout.sql
-- Idempotent & Safe: Run in Supabase SQL Editor.
-- Does NOT drop tables, preserves all existing user orders and data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ORDERS TABLE SCHEMA UPDATES FOR GUEST CHECKOUT
-- ----------------------------------------------------------------------------

-- Allow user_id to be NULL for guest orders
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Ensure all customer and guest tracking fields exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token_hash TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

-- Drop foreign key constraint on user_id if strict NOT NULL was attached, and re-add as ON DELETE SET NULL or CASCADE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_user_id_fkey' AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_user_id_fkey;
        ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Indexes for guest lookups & idempotency
CREATE INDEX IF NOT EXISTS idx_orders_guest_access_token
    ON public.orders (guest_access_token)
    WHERE guest_access_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email
    ON public.orders (customer_email);

-- Update user_idempotency index to support both authenticated and guest orders
DROP INDEX IF EXISTS public.idx_orders_user_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency
    ON public.orders (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. SECURE TOKEN GENERATOR HELPER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_guest_access_token()
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT encode(gen_random_bytes(24), 'hex');
$$;

-- ----------------------------------------------------------------------------
-- 3. UPGRADED ATOMIC RPC: create_pending_order()
-- Supports BOTH Authenticated and Guest Checkouts seamlessly.
-- Accepts items directly from guest cart or reads from database cart for authenticated users.
-- Validates stock, calculates trusted totals server-side, reserves inventory.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pending_order(
    p_user_id UUID DEFAULT NULL,
    p_provider TEXT DEFAULT 'razorpay',
    p_idempotency_key TEXT DEFAULT NULL,
    p_coupon_code TEXT DEFAULT NULL,
    p_shipping_address JSONB DEFAULT '{}'::jsonb,
    p_delivery_method TEXT DEFAULT 'standard',
    p_charged_currency TEXT DEFAULT 'INR',
    p_guest_email TEXT DEFAULT NULL,
    p_guest_name TEXT DEFAULT NULL,
    p_guest_phone TEXT DEFAULT NULL,
    p_items JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cart_id UUID;
    v_order_id UUID;
    v_order_number TEXT;
    v_guest_token TEXT;
    v_subtotal NUMERIC(12, 2) := 0;
    v_discount NUMERIC(12, 2) := 0;
    v_shipping NUMERIC(12, 2) := 0;
    v_tax NUMERIC(12, 2) := 0;
    v_total NUMERIC(12, 2) := 0;
    v_charged_amount NUMERIC(12, 2) := 0;
    v_conversion_rate NUMERIC(10, 4) := 0.0120;
    v_cart_fingerprint TEXT;
    v_item RECORD;
    v_prod RECORD;
    v_inv RECORD;
    v_coupon RECORD;
    v_existing_order RECORD;
    v_item_count INTEGER := 0;
    v_cust_email TEXT;
    v_cust_name TEXT;
    v_cust_phone TEXT;
    v_json_item JSONB;
    v_prod_key TEXT;
    v_item_qty INT;
    v_item_variant TEXT;
BEGIN
    -- Resolve customer identity fields from params or shipping address
    v_cust_email := COALESCE(NULLIF(trim(p_guest_email), ''), p_shipping_address->>'email');
    v_cust_name := COALESCE(NULLIF(trim(p_guest_name), ''), trim(concat(p_shipping_address->>'firstName', ' ', p_shipping_address->>'lastName')));
    v_cust_phone := COALESCE(NULLIF(trim(p_guest_phone), ''), p_shipping_address->>'phone');

    -- Validate required customer email
    IF v_cust_email IS NULL OR v_cust_email = '' OR v_cust_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'INVALID_EMAIL: A valid customer email address is required for order confirmation';
    END IF;

    -- 1. Check for existing order by idempotency_key
    IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) <> '' THEN
        IF p_user_id IS NOT NULL THEN
            SELECT * INTO v_existing_order
            FROM public.orders
            WHERE user_id = p_user_id
              AND idempotency_key = p_idempotency_key;
        ELSE
            SELECT * INTO v_existing_order
            FROM public.orders
            WHERE user_id IS NULL
              AND customer_email = v_cust_email
              AND idempotency_key = p_idempotency_key;
        END IF;

        IF v_existing_order.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'order_id', v_existing_order.id,
                'order_number', v_existing_order.order_number,
                'guest_access_token', v_existing_order.guest_access_token,
                'subtotal', v_existing_order.subtotal,
                'discount', v_existing_order.discount,
                'shipping', v_existing_order.shipping,
                'tax', v_existing_order.tax,
                'total', v_existing_order.total,
                'currency', v_existing_order.currency,
                'charged_amount', v_existing_order.charged_amount,
                'charged_currency', v_existing_order.charged_currency,
                'payment_status', v_existing_order.payment_status,
                'provider_order_id', v_existing_order.provider_order_id,
                'is_existing', true
            );
        END IF;
    END IF;

    -- 2. Sweep expired reservations to free up abandoned stock
    PERFORM public.release_expired_reservations();

    -- Create temporary table to normalize cart items across guest (JSONB) or authenticated (public.carts)
    CREATE TEMP TABLE tmp_checkout_items (
        prod_id UUID,
        prod_slug TEXT,
        prod_name TEXT,
        unit_price NUMERIC(12, 2),
        quantity INT,
        variant TEXT,
        image_url TEXT
    ) ON COMMIT DROP;

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        -- GUEST OR DIRECT ITEMS PATH
        FOR v_json_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_prod_key := COALESCE(v_json_item->>'product_id', v_json_item->>'product_key', v_json_item->'product'->>'slug', v_json_item->'product'->>'id');
            v_item_qty := GREATEST(1, COALESCE((v_json_item->>'quantity')::INT, 1));
            v_item_variant := COALESCE(v_json_item->>'selectedVariant', v_json_item->>'variant', 'Standard');

            -- Look up product in public.products
            SELECT p.id, p.slug, p.name, p.price, p.is_active, p.images[1] AS image_url
            INTO v_prod
            FROM public.products p
            WHERE (p.id::text = v_prod_key OR p.slug = v_prod_key)
            LIMIT 1;

            IF v_prod.id IS NULL THEN
                -- If not in database table, match against local catalog slugs
                RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product "%" was not found in catalog', v_prod_key;
            END IF;

            IF v_prod.is_active IS FALSE THEN
                RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: Product "%" is currently discontinued', v_prod.name;
            END IF;

            INSERT INTO tmp_checkout_items (prod_id, prod_slug, prod_name, unit_price, quantity, variant, image_url)
            VALUES (v_prod.id, v_prod.slug, v_prod.name, v_prod.price, v_item_qty, v_item_variant, v_prod.image_url);
        END LOOP;
    ELSE
        -- AUTHENTICATED USER CART PATH (from database public.carts)
        IF p_user_id IS NULL THEN
            RAISE EXCEPTION 'CART_EMPTY: No items provided for guest checkout';
        END IF;

        SELECT id INTO v_cart_id
        FROM public.carts
        WHERE user_id = p_user_id
        FOR UPDATE;

        IF v_cart_id IS NULL THEN
            RAISE EXCEPTION 'CART_EMPTY: User has no active cart';
        END IF;

        INSERT INTO tmp_checkout_items (prod_id, prod_slug, prod_name, unit_price, quantity, variant, image_url)
        SELECT
            p.id,
            p.slug,
            p.name,
            p.price,
            ci.quantity,
            COALESCE(ci.selected_variant, 'Standard'),
            p.images[1]
        FROM public.cart_items ci
        JOIN public.products p ON (p.id = ci.product_id OR p.slug = ci.product_key)
        WHERE ci.cart_id = v_cart_id;
    END IF;

    SELECT count(*) INTO v_item_count FROM tmp_checkout_items;
    IF v_item_count = 0 OR v_item_count IS NULL THEN
        RAISE EXCEPTION 'CART_EMPTY: Cart contains no valid items';
    END IF;

    -- 3. Lock inventory rows FOR UPDATE in deterministic order (prod_id ASC) to prevent deadlocks
    FOR v_item IN
        SELECT prod_id, prod_slug, prod_name, unit_price, quantity, variant, image_url
        FROM tmp_checkout_items
        ORDER BY prod_id ASC
    LOOP
        SELECT * INTO v_inv
        FROM public.inventory
        WHERE product_id = v_item.prod_id
        FOR UPDATE;

        -- If inventory record is missing, initialize it safely with default stock
        IF v_inv.product_id IS NULL THEN
            INSERT INTO public.inventory (product_id, quantity, reserved_quantity)
            VALUES (v_item.prod_id, 10, 0)
            RETURNING * INTO v_inv;
        END IF;

        IF (v_inv.quantity - v_inv.reserved_quantity) < v_item.quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Product "%" has insufficient stock (available: %)',
                v_item.prod_name,
                GREATEST(0, v_inv.quantity - v_inv.reserved_quantity);
        END IF;

        v_subtotal := v_subtotal + (v_item.unit_price * v_item.quantity);
    END LOOP;

    -- 4. Validate Coupon from server source of truth
    IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE code = upper(trim(p_coupon_code))
          AND is_active = true;

        IF v_coupon.id IS NULL THEN
            -- Check built-in fallback promo coupons
            IF upper(trim(p_coupon_code)) = 'NYX10' THEN
                v_discount := round((v_subtotal * 10.0) / 100.0, 2);
            ELSIF upper(trim(p_coupon_code)) = 'DRIP20' AND v_subtotal >= 1499.00 THEN
                v_discount := round((v_subtotal * 20.0) / 100.0, 2);
            ELSIF upper(trim(p_coupon_code)) = 'CYBER15' AND v_subtotal >= 999.00 THEN
                v_discount := round((v_subtotal * 15.0) / 100.0, 2);
            ELSE
                RAISE EXCEPTION 'COUPON_INVALID: Invalid coupon code "%"', p_coupon_code;
            END IF;
        ELSE
            IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
                RAISE EXCEPTION 'COUPON_INVALID: Coupon "%" has expired', p_coupon_code;
            END IF;
            IF v_coupon.max_uses IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_uses THEN
                RAISE EXCEPTION 'COUPON_INVALID: Coupon "%" maximum redemption reached', p_coupon_code;
            END IF;
            IF v_coupon.min_order_amount > 0 AND v_subtotal < v_coupon.min_order_amount THEN
                RAISE EXCEPTION 'COUPON_INVALID: Minimum order of ₹% required for coupon "%"',
                    v_coupon.min_order_amount, p_coupon_code;
            END IF;

            v_discount := round((v_subtotal * v_coupon.discount_percent) / 100.0, 2);
            IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
                v_discount := v_coupon.max_discount_amount;
            END IF;
        END IF;
    END IF;

    -- 5. Shipping calculation: Free over ₹999, else ₹99. Express is +₹150.
    IF v_subtotal >= 999.00 THEN
        v_shipping := 0.00;
    ELSE
        v_shipping := 99.00;
    END IF;

    IF p_delivery_method = 'express' THEN
        v_shipping := v_shipping + 150.00;
    END IF;

    -- 6. Final Order Total
    v_total := GREATEST(0.00, v_subtotal - v_discount + v_shipping + v_tax);

    -- 7. Currency & Charged Amount
    SELECT inr_to_usd_rate INTO v_conversion_rate
    FROM public.store_settings
    WHERE id = 'default';
    IF v_conversion_rate IS NULL OR v_conversion_rate <= 0 THEN
        v_conversion_rate := 0.0120;
    END IF;

    IF p_provider = 'paypal' AND upper(p_charged_currency) = 'USD' THEN
        v_charged_amount := round(v_total * v_conversion_rate, 2);
    ELSE
        v_charged_amount := v_total;
    END IF;

    -- 8. Generate Server Order Number & Cryptographic Guest Access Token
    v_order_number := public.generate_order_number();
    v_guest_token := public.generate_guest_access_token();

    -- Calculate cart fingerprint
    SELECT md5(string_agg(prod_slug || ':' || quantity::text, '|' ORDER BY prod_slug))
    INTO v_cart_fingerprint
    FROM tmp_checkout_items;

    -- 9. Insert into public.orders (user_id IS NULL for guests!)
    INSERT INTO public.orders (
        user_id,
        order_number,
        customer_email,
        customer_name,
        customer_phone,
        guest_access_token,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        currency,
        coupon_code,
        payment_provider,
        payment_status,
        order_status,
        charged_amount,
        charged_currency,
        idempotency_key,
        cart_fingerprint,
        shipping_address,
        delivery_method
    )
    VALUES (
        p_user_id,
        v_order_number,
        v_cust_email,
        v_cust_name,
        v_cust_phone,
        v_guest_token,
        v_subtotal,
        v_discount,
        v_shipping,
        v_tax,
        v_total,
        'INR',
        p_coupon_code,
        p_provider,
        'pending',
        'pending',
        v_charged_amount,
        p_charged_currency,
        p_idempotency_key,
        v_cart_fingerprint,
        p_shipping_address,
        p_delivery_method
    )
    RETURNING id INTO v_order_id;

    -- 10. Insert snapshot order items & create inventory reservations
    FOR v_item IN SELECT * FROM tmp_checkout_items LOOP
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name_snapshot,
            product_slug,
            price_snapshot,
            quantity,
            selected_variant,
            product_image
        )
        VALUES (
            v_order_id,
            v_item.prod_id,
            v_item.prod_name,
            v_item.prod_slug,
            v_item.unit_price,
            v_item.quantity,
            v_item.variant,
            v_item.image_url
        );

        -- Reserve stock in inventory table
        UPDATE public.inventory
        SET reserved_quantity = reserved_quantity + v_item.quantity,
            updated_at = now()
        WHERE product_id = v_item.prod_id;

        -- Record inventory reservation with 15-minute expiry
        INSERT INTO public.inventory_reservations (
            order_id,
            product_id,
            quantity,
            status,
            expires_at
        )
        VALUES (
            v_order_id,
            v_item.prod_id,
            v_item.quantity,
            'reserved',
            now() + interval '15 minutes'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'guest_access_token', v_guest_token,
        'subtotal', v_subtotal,
        'discount', v_discount,
        'shipping', v_shipping,
        'tax', v_tax,
        'total', v_total,
        'currency', 'INR',
        'charged_amount', v_charged_amount,
        'charged_currency', p_charged_currency,
        'payment_status', 'pending',
        'is_existing', false
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. SECURE GUEST ORDER RETRIEVAL RPC: get_guest_order()
-- Allows guests to view their order via secure order_number + access token.
-- Prevents unauthorized order snooping.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guest_order(
    p_order_number TEXT,
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        'product_name', oi.product_name_snapshot,
        'product_slug', oi.product_slug,
        'price', oi.price_snapshot,
        'quantity', oi.quantity,
        'selected_variant', oi.selected_variant,
        'image', oi.product_image
    )) INTO v_items
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id;

    RETURN jsonb_build_object(
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'customer_name', v_order.customer_name,
        'customer_email', v_order.customer_email,
        'customer_phone', v_order.customer_phone,
        'shipping_address', v_order.shipping_address,
        'delivery_method', v_order.delivery_method,
        'payment_provider', v_order.payment_provider,
        'payment_status', v_order.payment_status,
        'order_status', v_order.order_status,
        'subtotal', v_order.subtotal,
        'discount', v_order.discount,
        'shipping', v_order.shipping,
        'tax', v_order.tax,
        'total', v_order.total,
        'currency', v_order.currency,
        'created_at', v_order.created_at,
        'items', COALESCE(v_items, '[]'::jsonb)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. PERMISSIONS & SECURITY
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_pending_order FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_order TO service_role;

GRANT EXECUTE ON FUNCTION public.get_guest_order TO anon, authenticated, service_role;
