-- ============================================================================
-- NYX DRIPSTORE: DATABASE-BACKED CART MIGRATION SCRIPT
-- Paste this script directly into Supabase SQL Editor and click "Run".
-- Safe & Idempotent: Can be executed multiple times without deleting or corrupting existing data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CARTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all required columns exist if table was already present
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure unique constraint on user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'carts_user_id_key'
    ) THEN
        ALTER TABLE public.carts ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CART_ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_key TEXT NOT NULL,
    product_id UUID NULL,  -- Reserved for future products table link. NO foreign key constraint now.
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 99),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist without touching existing data
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS product_key TEXT;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS product_id UUID NULL;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure unique constraint on (cart_id, product_key)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cart_items_cart_id_product_key_key'
    ) THEN
        ALTER TABLE public.cart_items
        ADD CONSTRAINT cart_items_cart_id_product_key_key UNIQUE (cart_id, product_key);
    END IF;
END $$;

-- Index on cart_id for fast queries
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS: AUTO-UPDATE UPDATED_AT AND BUMP PARENT CART
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_carts_updated_at ON public.carts;
CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON public.carts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger to bump parent cart updated_at whenever items are added, modified, or deleted
CREATE OR REPLACE FUNCTION public.bump_parent_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        UPDATE public.carts SET updated_at = now() WHERE id = OLD.cart_id;
        RETURN OLD;
    ELSE
        UPDATE public.carts SET updated_at = now() WHERE id = NEW.cart_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cart_items_bump_parent ON public.cart_items;
CREATE TRIGGER trg_cart_items_bump_parent
    AFTER INSERT OR UPDATE OR DELETE ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION public.bump_parent_cart_updated_at();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Carts policies (Authenticated users only touch their own cart)
DROP POLICY IF EXISTS "Users can view own cart" ON public.carts;
CREATE POLICY "Users can view own cart"
    ON public.carts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
CREATE POLICY "Users can insert own cart"
    ON public.carts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
CREATE POLICY "Users can update own cart"
    ON public.carts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;
CREATE POLICY "Users can delete own cart"
    ON public.carts FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Cart items policies (Authenticated users only touch items in their own cart)
DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
CREATE POLICY "Users can view own cart items"
    ON public.cart_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.carts c
            WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
CREATE POLICY "Users can insert own cart items"
    ON public.cart_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.carts c
            WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
CREATE POLICY "Users can update own cart items"
    ON public.cart_items FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.carts c
            WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.carts c
            WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
CREATE POLICY "Users can delete own cart items"
    ON public.cart_items FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.carts c
            WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- 5. ATOMIC RPC FUNCTIONS (SECURITY INVOKER, search_path = public)
-- ----------------------------------------------------------------------------

-- 1. get_or_create_cart(): Atomic cart retrieval/initialization
CREATE OR REPLACE FUNCTION public.get_or_create_cart()
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_cart_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Upsert cart for current user
    INSERT INTO public.carts (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Return the existing or newly created cart id
    SELECT id INTO v_cart_id
    FROM public.carts
    WHERE user_id = v_user_id;

    RETURN v_cart_id;
END;
$$;

-- 2. merge_guest_cart(items): Atomic transaction to merge guest items into user cart
CREATE OR REPLACE FUNCTION public.merge_guest_cart(items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_cart_id UUID;
    v_user_id UUID;
    v_record RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN
        RETURN;
    END IF;

    -- Get or create cart for user
    v_cart_id := public.get_or_create_cart();

    -- Aggregate duplicates inside payload, validate, and upsert
    FOR v_record IN
        SELECT
            trim(elem->>'product_key') AS p_key,
            LEAST(GREATEST(SUM(COALESCE((elem->>'quantity')::integer, 1)), 1), 99)::integer AS p_qty
        FROM jsonb_array_elements(items) AS elem
        WHERE elem->>'product_key' IS NOT NULL
          AND trim(elem->>'product_key') <> ''
        GROUP BY trim(elem->>'product_key')
    LOOP
        INSERT INTO public.cart_items (cart_id, product_key, quantity)
        VALUES (v_cart_id, v_record.p_key, v_record.p_qty)
        ON CONFLICT (cart_id, product_key)
        DO UPDATE SET
            quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 99),
            updated_at = now();
    END LOOP;
END;
$$;

-- 3. add_to_cart(p_product_key, p_quantity): Atomic single round-trip item addition
CREATE OR REPLACE FUNCTION public.add_to_cart(p_product_key TEXT, p_quantity INTEGER DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_cart_id UUID;
    v_clean_key TEXT;
    v_qty INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_clean_key := trim(p_product_key);
    IF v_clean_key IS NULL OR v_clean_key = '' THEN
        RAISE EXCEPTION 'Invalid product key';
    END IF;

    v_qty := LEAST(GREATEST(COALESCE(p_quantity, 1), 1), 99);
    v_cart_id := public.get_or_create_cart();

    INSERT INTO public.cart_items (cart_id, product_key, quantity)
    VALUES (v_cart_id, v_clean_key, v_qty)
    ON CONFLICT (cart_id, product_key)
    DO UPDATE SET
        quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 99),
        updated_at = now();
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. PERMISSIONS
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_or_create_cart() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_guest_cart(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_to_cart(TEXT, INTEGER) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_or_create_cart() FROM anon;
REVOKE EXECUTE ON FUNCTION public.merge_guest_cart(JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_to_cart(TEXT, INTEGER) FROM anon;

-- ============================================================================
-- FUTURE MIGRATION (COMMENTED - DO NOT RUN UNTIL PRODUCTS TABLE LINK IS ACTIVATED)
-- =================================-------------------------------------------
/*
-- Step 1: Backfill product_id in public.cart_items from products.id matching slug or key:
-- UPDATE public.cart_items ci
-- SET product_id = p.id
-- FROM public.products p
-- WHERE ci.product_id IS NULL
--   AND (ci.product_key = p.slug OR ci.product_key = p.id::text);

-- Step 2: Add foreign key constraint to products(id):
-- ALTER TABLE public.cart_items
-- ADD CONSTRAINT fk_cart_items_product_id
-- FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
*/
