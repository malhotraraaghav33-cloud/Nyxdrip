-- ============================================================================
-- NYX DRIPSTORE - PRODUCTION CATALOG REPLACEMENT MIGRATION
-- Migration: 20261002_replace_catalog_with_real_products.sql
-- Idempotent & Safe: Run in Supabase SQL Editor.
-- Does NOT drop tables, does NOT delete order history, preserves snapshots.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 0: READ-ONLY DEPENDENCY AUDIT (Run first to inspect references)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '=== AUDITING DEPENDENCIES BEFORE CATALOG MODIFICATION ===';
END $$;

-- Check any existing cart items referencing dummy products
SELECT 
    ci.id AS cart_item_id,
    ci.cart_id,
    ci.product_id,
    ci.product_key,
    p.slug,
    p.name
FROM public.cart_items ci
LEFT JOIN public.products p ON ci.product_id = p.id
WHERE p.slug NOT IN (
    'triple-cross-ch-necklace',
    'angel-creed-necklace',
    'ch-bracelet-1-0',
    'royal-fleur-studs',
    'black-metallic-wallet',
    'blue-metallic-wallet',
    'red-cosmic-star-necklace',
    'y2k-devil-cap',
    'y2k-heart-necklace',
    'red-cross-pendant',
    'bersek-pendant',
    'ch-pendant',
    'double-cross-pendant',
    'snake-cross-necklace'
);

-- ----------------------------------------------------------------------------
-- STEP 1: ENSURE COMPATIBLE SCHEMA & COLUMNS EXIST
-- ----------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'Gothic';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_is_placeholder BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;

-- Ensure UNIQUE index exists on products.slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);

-- ----------------------------------------------------------------------------
-- STEP 2: INSERT / UPSERT THE 14 REAL CATALOG PRODUCTS
-- Uses ON CONFLICT (slug) DO UPDATE:
-- Leaves existing images, price, and stock intact if already configured.
-- ----------------------------------------------------------------------------
INSERT INTO public.products (
    slug,
    name,
    category,
    description,
    price,
    price_is_placeholder,
    stock,
    is_active,
    is_new_arrival,
    images
) VALUES
(
    'triple-cross-ch-necklace',
    'Triple Cross CH Necklace',
    'Necklaces',
    '[Placeholder — description to be updated] Triple Cross CH Necklace from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/triple cross/IMG-20261002-WA0000.jpg',
        '/nyxdrip/triple cross/IMG-20261002-WA0002.jpg',
        '/nyxdrip/triple cross/IMG-20261002-WA0014.jpg'
    ]::TEXT[]
),
(
    'angel-creed-necklace',
    'Angel Creed Necklace',
    'Necklaces',
    '[Placeholder — description to be updated] Angel Creed Necklace from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Angle creed necklace/IMG-20261002-WA0008.jpg',
        '/nyxdrip/Angle creed necklace/IMG-20261002-WA0013.jpg',
        '/nyxdrip/Angle creed necklace/IMG-20261002-WA0034.jpg'
    ]::TEXT[]
),
(
    'ch-bracelet-1-0',
    'CH Bracelet 1.0',
    'Bracelets',
    '[Placeholder — description to be updated] CH Bracelet 1.0 from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Ch bracelete 1.0/IMG-20261002-WA0006.jpg',
        '/nyxdrip/Ch bracelete 1.0/IMG-20261002-WA0040.jpg'
    ]::TEXT[]
),
(
    'royal-fleur-studs',
    'Royal Fleur Studs',
    'Studs / Earrings',
    '[Placeholder — description to be updated] Royal Fleur Studs from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0011.jpg',
        '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0035.jpg',
        '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0038.jpg'
    ]::TEXT[]
),
(
    'black-metallic-wallet',
    'Black Metallic Wallet',
    'Wallets',
    '[Placeholder — description to be updated] Black Metallic Wallet from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Black Merttalic Wallet/IMG-20261002-WA0001.jpg',
        '/nyxdrip/Black Merttalic Wallet/IMG-20261002-WA0005.jpg'
    ]::TEXT[]
),
(
    'blue-metallic-wallet',
    'Blue Metallic Wallet',
    'Wallets',
    '[Placeholder — description to be updated] Blue Metallic Wallet from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0029.jpg',
        '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0030.jpg',
        '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0033.jpg'
    ]::TEXT[]
),
(
    'red-cosmic-star-necklace',
    'Red Cosmic Star Necklace',
    'Necklaces',
    '[Placeholder — description to be updated] Red Cosmic Star Necklace from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Red Cosmic Star Necklace/IMG-20261002-WA0031.jpg',
        '/nyxdrip/Red Cosmic Star Necklace/IMG-20261002-WA0032.jpg'
    ]::TEXT[]
),
(
    'y2k-devil-cap',
    'Y2K Devil Cap',
    'Caps',
    '[Placeholder — description to be updated] Y2K Devil Cap from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Y2k Devil Cap/IMG-20261002-WA0039.jpg'
    ]::TEXT[]
),
(
    'y2k-heart-necklace',
    'Y2K Heart Necklace',
    'Necklaces',
    '[Placeholder — description to be updated] Y2K Heart Necklace from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Y2k heart Necklace/IMG-20261002-WA0041.jpg',
        '/nyxdrip/Y2k heart Necklace/IMG-20261002-WA0042.jpg'
    ]::TEXT[]
),
(
    'red-cross-pendant',
    'Red Cross Pendant',
    'Pendants',
    '[Placeholder — description to be updated] Red Cross Pendant from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY['/assets/products/placeholder.svg']::TEXT[]
),
(
    'bersek-pendant',
    'Bersek Pendant',
    'Pendants',
    '[Placeholder — description to be updated] Bersek Pendant from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY['/assets/products/placeholder.svg']::TEXT[]
),
(
    'ch-pendant',
    'CH Pendant',
    'Pendants',
    '[Placeholder — description to be updated] CH Pendant from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY['/assets/products/placeholder.svg']::TEXT[]
),
(
    'double-cross-pendant',
    'Double Cross Pendant',
    'Pendants',
    '[Placeholder — description to be updated] Double Cross Pendant from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY['/assets/products/placeholder.svg']::TEXT[]
),
(
    'snake-cross-necklace',
    'Snake Cross Necklace',
    'Necklaces',
    '[Placeholder — description to be updated] Snake Cross Necklace from the NYx DRIPstore collection.',
    0.00,
    true,
    10,
    true,
    true,
    ARRAY['/assets/products/placeholder.svg']::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

-- ----------------------------------------------------------------------------
-- STEP 3: SAFELY DEACTIVATE OLD DUMMY PRODUCTS
-- Ensures no dummy products are returned to the storefront, while preserving
-- all references for foreign keys or historical logs.
-- ----------------------------------------------------------------------------
UPDATE public.products
SET is_active = false, updated_at = now()
WHERE slug NOT IN (
    'triple-cross-ch-necklace',
    'angel-creed-necklace',
    'ch-bracelet-1-0',
    'royal-fleur-studs',
    'black-metallic-wallet',
    'blue-metallic-wallet',
    'red-cosmic-star-necklace',
    'y2k-devil-cap',
    'y2k-heart-necklace',
    'red-cross-pendant',
    'bersek-pendant',
    'ch-pendant',
    'double-cross-pendant',
    'snake-cross-necklace'
);

-- ----------------------------------------------------------------------------
-- STEP 4: ENSURE INVENTORY RECORDS EXIST FOR ALL 14 PRODUCTS
-- ----------------------------------------------------------------------------
INSERT INTO public.inventory (product_id, quantity, low_stock_threshold, updated_at)
SELECT p.id, 10, 5, now()
FROM public.products p
WHERE p.slug IN (
    'triple-cross-ch-necklace',
    'angel-creed-necklace',
    'ch-bracelet-1-0',
    'royal-fleur-studs',
    'black-metallic-wallet',
    'blue-metallic-wallet',
    'red-cosmic-star-necklace',
    'y2k-devil-cap',
    'y2k-heart-necklace',
    'red-cross-pendant',
    'bersek-pendant',
    'ch-pendant',
    'double-cross-pendant',
    'snake-cross-necklace'
)
ON CONFLICT (product_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- STEP 5: CLEAN UP STALE CART ITEMS REFERENCING DEACTIVATED PRODUCTS
-- ----------------------------------------------------------------------------
DELETE FROM public.cart_items
WHERE product_id IN (
    SELECT id FROM public.products WHERE is_active = false
);

-- ----------------------------------------------------------------------------
-- SUMMARY VERIFICATION OUTPUT
-- ----------------------------------------------------------------------------
SELECT id, slug, name, category, price, is_active, stock, cardinality(images) AS photo_count
FROM public.products
WHERE is_active = true
ORDER BY name;
