-- ============================================================================
-- NYX DRIPSTORE: COMPLETE PAYMENT PROCESSING MIGRATION
-- Real Payment Processing with Razorpay & PayPal
-- Idempotent: Safe to run multiple times without data loss.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. STORE SETTINGS (Server-controlled conversion rates & settings)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    inr_to_usd_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.0120, -- Default $1 = ~₹83.33
    free_shipping_threshold NUMERIC(10, 2) NOT NULL DEFAULT 999.00,
    standard_shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 99.00,
    express_shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 249.00,
    tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.store_settings (id, inr_to_usd_rate, free_shipping_threshold, standard_shipping_fee, express_shipping_fee)
VALUES ('default', 0.0120, 999.00, 99.00, 249.00)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. ORDER NUMBER SEQUENCE & GENERATOR
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'NYX-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    shipping NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    coupon_code TEXT NULL,
    payment_provider TEXT NULL CHECK (payment_provider IN ('razorpay', 'paypal', 'mock')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
    order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    provider_order_id TEXT NULL,
    provider_payment_id TEXT NULL,
    charged_amount NUMERIC(12, 2) NULL,
    charged_currency TEXT NULL,
    idempotency_key TEXT NULL,
    cart_fingerprint TEXT NULL,
    shipping_address JSONB NOT NULL,
    delivery_method TEXT NOT NULL DEFAULT 'standard',
    paid_at TIMESTAMPTZ NULL,
    confirmation_email_sent_at TIMESTAMPTZ NULL,
    needs_attention BOOLEAN NOT NULL DEFAULT false,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist idempotently
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS charged_amount NUMERIC(12, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS charged_currency TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cart_fingerprint TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'standard';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Indexes & Unique Constraints on Orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency
    ON public.orders (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_order_id
    ON public.orders (provider_order_id)
    WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_payment_id
    ON public.orders (provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_created
    ON public.orders (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. ORDER ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name_snapshot TEXT NOT NULL,
    product_slug TEXT NULL,
    price_snapshot NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    selected_variant TEXT NULL DEFAULT 'Standard',
    product_image TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_slug TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price_snapshot NUMERIC(12, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_variant TEXT DEFAULT 'Standard';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_image TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

-- ----------------------------------------------------------------------------
-- 5. PAYMENT EVENTS (Webhook deduplication & audit log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
    payload JSONB NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payment_events_provider_event_key UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON public.payment_events (order_id);

-- ----------------------------------------------------------------------------
-- 6. INVENTORY & RESERVATIONS
-- ----------------------------------------------------------------------------
-- Ensure inventory has reserved_quantity and proper constraints
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_quantity_non_neg') THEN
        ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_quantity_non_neg CHECK (quantity >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_reserved_non_neg') THEN
        ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_reserved_non_neg CHECK (reserved_quantity >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_reserved_lte_qty') THEN
        ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_reserved_lte_qty CHECK (reserved_quantity <= quantity);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL CHECK (status IN ('reserved', 'committed', 'released')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT inventory_reservations_order_product_key UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status_expires
    ON public.inventory_reservations (status, expires_at);

-- ----------------------------------------------------------------------------
-- 7. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_reservations_updated_at ON public.inventory_reservations;
CREATE TRIGGER trg_inventory_reservations_updated_at
    BEFORE UPDATE ON public.inventory_reservations
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Orders: Authenticated users can SELECT only their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Order Items: Authenticated users can SELECT items belonging to their orders
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
              AND o.user_id = auth.uid()
        )
    );

-- Store Settings: Public read-only
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
CREATE POLICY "Public can view store settings"
    ON public.store_settings FOR SELECT
    TO public
    USING (true);

-- NO CLIENT INSERT / UPDATE / DELETE on orders, order_items, inventory, reservations, payment_events.
-- All mutations occur securely via Edge Functions executing with the service_role key.

-- ----------------------------------------------------------------------------
-- 9. ATOMIC RPC 1: release_expired_reservations()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_released_count INTEGER := 0;
    v_res RECORD;
BEGIN
    FOR v_res IN
        SELECT r.id, r.order_id, r.product_id, r.quantity
        FROM public.inventory_reservations r
        WHERE r.status = 'reserved'
          AND r.expires_at < now()
        FOR UPDATE
    LOOP
        -- Release reserved inventory count
        UPDATE public.inventory
        SET reserved_quantity = GREATEST(0, reserved_quantity - v_res.quantity),
            updated_at = now()
        WHERE product_id = v_res.product_id;

        -- Mark reservation as released
        UPDATE public.inventory_reservations
        SET status = 'released',
            updated_at = now()
        WHERE id = v_res.id;

        -- Cancel associated pending order
        UPDATE public.orders
        SET payment_status = 'cancelled',
            order_status = 'cancelled',
            notes = COALESCE(notes, '') || ' [Reservation expired and released]',
            updated_at = now()
        WHERE id = v_res.order_id
          AND payment_status = 'pending';

        v_released_count := v_released_count + 1;
    END LOOP;

    RETURN v_released_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. ATOMIC RPC 2: create_pending_order()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pending_order(
    p_user_id UUID,
    p_provider TEXT,
    p_idempotency_key TEXT,
    p_coupon_code TEXT DEFAULT NULL,
    p_shipping_address JSONB DEFAULT '{}'::jsonb,
    p_delivery_method TEXT DEFAULT 'standard',
    p_charged_currency TEXT DEFAULT 'INR'
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
BEGIN
    -- 1. Check for existing order by user_id + idempotency_key
    IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) <> '' THEN
        SELECT * INTO v_existing_order
        FROM public.orders
        WHERE user_id = p_user_id
          AND idempotency_key = p_idempotency_key;

        IF v_existing_order.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'order_id', v_existing_order.id,
                'order_number', v_existing_order.order_number,
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

    -- 3. Lock user's cart
    SELECT id INTO v_cart_id
    FROM public.carts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_cart_id IS NULL THEN
        RAISE EXCEPTION 'CART_EMPTY: User has no active cart';
    END IF;

    -- 4. Calculate cart fingerprint and verify non-empty
    SELECT
        md5(string_agg(coalesce(ci.product_id::text, ci.product_key) || ':' || ci.quantity::text, '|' ORDER BY coalesce(ci.product_id::text, ci.product_key))),
        count(*)
    INTO v_cart_fingerprint, v_item_count
    FROM public.cart_items ci
    WHERE ci.cart_id = v_cart_id;

    IF v_item_count = 0 OR v_item_count IS NULL THEN
        RAISE EXCEPTION 'CART_EMPTY: Cart contains no items';
    END IF;

    -- 5. Lock inventory in deterministic order (by product_id) to prevent deadlocks
    FOR v_item IN
        SELECT
            ci.id AS cart_item_id,
            COALESCE(ci.product_id, p.id) AS prod_id,
            ci.product_key,
            ci.quantity,
            p.name AS product_name,
            p.slug AS product_slug,
            p.price AS trusted_price,
            p.images,
            p.is_active
        FROM public.cart_items ci
        JOIN public.products p ON (p.id = ci.product_id OR p.slug = ci.product_key)
        WHERE ci.cart_id = v_cart_id
        ORDER BY COALESCE(ci.product_id, p.id) ASC
    LOOP
        -- Check product active status
        IF v_item.is_active IS FALSE THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: Product "%" is currently discontinued', v_item.product_name;
        END IF;

        -- Lock inventory row FOR UPDATE
        SELECT * INTO v_inv
        FROM public.inventory
        WHERE product_id = v_item.prod_id
        FOR UPDATE;

        IF v_inv.product_id IS NULL THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Inventory record missing for "%"', v_item.product_name;
        END IF;

        IF (v_inv.quantity - v_inv.reserved_quantity) < v_item.quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Product "%" has insufficient stock (available: %)',
                v_item.product_name,
                GREATEST(0, v_inv.quantity - v_inv.reserved_quantity);
        END IF;

        v_subtotal := v_subtotal + (v_item.trusted_price * v_item.quantity);
    END LOOP;

    -- 6. Validate Coupon from server source of truth
    IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE code = upper(trim(p_coupon_code))
          AND is_active = true;

        IF v_coupon.id IS NULL THEN
            -- Check built-in fallback promo coupons
            IF upper(trim(p_coupon_code)) = 'NYX10' THEN
                v_discount := round((v_subtotal * 10.0) / 100.0, 2);
            ELSIF upper(trim(p_coupon_code)) = 'DRIP15' AND v_subtotal >= 1499.00 THEN
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

    -- 7. Shipping calculation: Free over ₹999, else ₹99. Express is +₹150.
    IF v_subtotal >= 999.00 THEN
        v_shipping := 0.00;
    ELSE
        v_shipping := 99.00;
    END IF;

    IF p_delivery_method = 'express' THEN
        v_shipping := v_shipping + 150.00;
    END IF;

    -- 8. Final Order Total
    v_total := GREATEST(0.00, v_subtotal - v_discount + v_shipping + v_tax);

    -- 9. Currency & Charged Amount
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

    -- 10. Generate Server Order Number
    v_order_number := public.generate_order_number();

    -- 11. Insert Orders record
    INSERT INTO public.orders (
        user_id,
        order_number,
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

    -- 12. Insert Order Items & Reserve Inventory
    FOR v_item IN
        SELECT
            COALESCE(ci.product_id, p.id) AS prod_id,
            p.name AS product_name,
            p.slug AS product_slug,
            p.price AS trusted_price,
            ci.quantity,
            COALESCE(p.images[1], NULL) AS product_image
        FROM public.cart_items ci
        JOIN public.products p ON (p.id = ci.product_id OR p.slug = ci.product_key)
        WHERE ci.cart_id = v_cart_id
    LOOP
        -- Insert snapshot item
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name_snapshot,
            product_slug,
            price_snapshot,
            quantity,
            product_image
        )
        VALUES (
            v_order_id,
            v_item.prod_id,
            v_item.product_name,
            v_item.product_slug,
            v_item.trusted_price,
            v_item.quantity,
            v_item.product_image
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
-- 11. ATOMIC RPC 3: finalize_paid_order()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_paid_order(
    p_order_id UUID,
    p_provider TEXT,
    p_provider_payment_id TEXT,
    p_amount NUMERIC,
    p_currency TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_res RECORD;
    v_inv RECORD;
    v_user_cart_id UUID;
    v_purchased_prod_ids UUID[];
BEGIN
    -- 1. Lock the order row
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order.id IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist', p_order_id;
    END IF;

    -- 2. Idempotent check: if already paid, return success immediately
    IF v_order.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'payment_status', 'paid',
            'already_paid', true
        );
    END IF;

    -- 3. Verify amount / currency (allow 0.05 tolerance for exchange rounding)
    IF v_order.charged_amount IS NOT NULL AND abs(v_order.charged_amount - p_amount) > 0.05 THEN
        RAISE EXCEPTION 'AMOUNT_MISMATCH: Order expected % %, but received % %',
            v_order.charged_currency, v_order.charged_amount, p_currency, p_amount;
    END IF;

    -- 4. Mark order as paid & confirmed
    UPDATE public.orders
    SET payment_status = 'paid',
        order_status = 'confirmed',
        provider_payment_id = p_provider_payment_id,
        payment_provider = COALESCE(payment_provider, p_provider),
        paid_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

    -- 5. Commit inventory reservations
    FOR v_res IN
        SELECT r.id, r.product_id, r.quantity, r.status
        FROM public.inventory_reservations r
        WHERE r.order_id = p_order_id
        FOR UPDATE
    LOOP
        SELECT * INTO v_inv
        FROM public.inventory
        WHERE product_id = v_res.product_id
        FOR UPDATE;

        IF v_res.status = 'reserved' THEN
            -- Standard path: deduct on-hand stock and free reserved quota
            UPDATE public.inventory
            SET quantity = GREATEST(0, quantity - v_res.quantity),
                reserved_quantity = GREATEST(0, reserved_quantity - v_res.quantity),
                updated_at = now()
            WHERE product_id = v_res.product_id;

            UPDATE public.inventory_reservations
            SET status = 'committed',
                updated_at = now()
            WHERE id = v_res.id;

        ELSIF v_res.status = 'released' THEN
            -- Edge case: payment succeeded after reservation expired
            IF v_inv.quantity >= v_res.quantity THEN
                UPDATE public.inventory
                SET quantity = quantity - v_res.quantity,
                    updated_at = now()
                WHERE product_id = v_res.product_id;

                UPDATE public.inventory_reservations
                SET status = 'committed',
                    updated_at = now()
                WHERE id = v_res.id;
            ELSE
                -- Stock was taken by someone else; mark order for admin attention
                UPDATE public.orders
                SET needs_attention = true,
                    notes = COALESCE(notes, '') || ' [LATE PAYMENT: Stock depleted post-release. Requires admin review/refund]',
                    updated_at = now()
                WHERE id = p_order_id;
            END IF;
        END IF;
    END LOOP;

    -- 6. Clean purchased items from user's active cart
    SELECT id INTO v_user_cart_id
    FROM public.carts
    WHERE user_id = v_order.user_id;

    IF v_user_cart_id IS NOT NULL THEN
        SELECT array_agg(product_id) INTO v_purchased_prod_ids
        FROM public.order_items
        WHERE order_id = p_order_id;

        IF v_purchased_prod_ids IS NOT NULL AND array_length(v_purchased_prod_ids, 1) > 0 THEN
            DELETE FROM public.cart_items
            WHERE cart_id = v_user_cart_id
              AND (product_id = ANY(v_purchased_prod_ids) OR product_key IN (
                  SELECT slug FROM public.products WHERE id = ANY(v_purchased_prod_ids)
              ));
        END IF;
    END IF;

    -- 7. If coupon used, increment coupon usage
    IF v_order.coupon_code IS NOT NULL THEN
        UPDATE public.coupons
        SET usage_count = usage_count + 1
        WHERE code = upper(v_order.coupon_code);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'payment_status', 'paid',
        'already_paid', false
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. ATOMIC RPC 4: release_order_reservation()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_order_reservation(
    p_order_id UUID,
    p_new_payment_status TEXT DEFAULT 'cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_res RECORD;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- Never release a paid order
    IF v_order.payment_status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_ALREADY_PAID');
    END IF;

    -- Update order status
    UPDATE public.orders
    SET payment_status = COALESCE(p_new_payment_status, 'cancelled'),
        order_status = 'cancelled',
        updated_at = now()
    WHERE id = p_order_id;

    -- Release reservations
    FOR v_res IN
        SELECT r.id, r.product_id, r.quantity
        FROM public.inventory_reservations r
        WHERE r.order_id = p_order_id
          AND r.status = 'reserved'
        FOR UPDATE
    LOOP
        UPDATE public.inventory
        SET reserved_quantity = GREATEST(0, reserved_quantity - v_res.quantity),
            updated_at = now()
        WHERE product_id = v_res.product_id;

        UPDATE public.inventory_reservations
        SET status = 'released',
            updated_at = now()
        WHERE id = v_res.id;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 13. REVOKE & GRANT PERMISSIONS
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_pending_order FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_paid_order FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_order_reservation FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_expired_reservations FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_pending_order TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_reservation TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations TO service_role;
