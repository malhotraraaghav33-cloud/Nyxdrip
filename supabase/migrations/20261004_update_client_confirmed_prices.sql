-- ============================================================================
-- NYX DRIPSTORE - CLIENT CONFIRMED PRICES & 15-PRODUCT CATALOG MIGRATION
-- Migration: 20261004_update_client_confirmed_prices.sql
-- Idempotent & Non-Destructive: Run in Supabase SQL Editor.
-- Does NOT drop tables, preserves order histories & cart items.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: ENSURE COMPATIBLE COLUMNS EXIST
-- ----------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS piece_unit TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_is_placeholder BOOLEAN DEFAULT false;

-- Ensure UNIQUE index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);

-- ----------------------------------------------------------------------------
-- STEP 2: MIGRATE PREVIOUS ABBREVIATED / DRAFT SLUGS TO NORMALIZED CLIENT SLUGS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- 1. ch-bracelet-1-0 -> ch-bracelet
    IF EXISTS (SELECT 1 FROM public.products WHERE slug = 'ch-bracelet-1-0') AND
       NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'ch-bracelet') THEN
        UPDATE public.products SET slug = 'ch-bracelet', name = 'CH Bracelet' WHERE slug = 'ch-bracelet-1-0';
    END IF;

    -- 2. y2k-devil-cap -> y2k-cap
    IF EXISTS (SELECT 1 FROM public.products WHERE slug = 'y2k-devil-cap') AND
       NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'y2k-cap') THEN
        UPDATE public.products SET slug = 'y2k-cap', name = 'Y2K Cap' WHERE slug = 'y2k-devil-cap';
    END IF;

    -- 3. bersek-pendant -> berserk-pendant
    IF EXISTS (SELECT 1 FROM public.products WHERE slug = 'bersek-pendant') AND
       NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'berserk-pendant') THEN
        UPDATE public.products SET slug = 'berserk-pendant', name = 'Berserk Pendant' WHERE slug = 'bersek-pendant';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 3: DEACTIVATE ALL OLD DUMMY PRODUCTS NOT IN THE 15 CLIENT CATALOG
-- ----------------------------------------------------------------------------
UPDATE public.products
SET is_active = false
WHERE slug NOT IN (
    'triple-cross-ch-necklace',
    'y2k-glass',
    'black-metallic-wallet',
    'angel-creed-necklace',
    'ch-bracelet',
    'royal-fleur-studs',
    'y2k-cap',
    'ch-pendant',
    'red-cross-pendant',
    'double-cross-pendant',
    'berserk-pendant',
    'blue-metallic-wallet',
    'red-cosmic-star-necklace',
    'y2k-heart-necklace',
    'snake-cross-necklace'
);

-- ----------------------------------------------------------------------------
-- STEP 4: UPSERT THE EXACT 15 CLIENT-CONFIRMED PRODUCTS WITH CONFIRMED PRICES
-- ----------------------------------------------------------------------------
INSERT INTO public.products (
    slug,
    name,
    category,
    description,
    price,
    original_price,
    price_is_placeholder,
    piece_unit,
    stock,
    is_active,
    is_new_arrival,
    images
) VALUES
-- 1. Triple Cross CH Necklace — ₹349
(
    'triple-cross-ch-necklace',
    'Triple Cross CH Necklace',
    'Necklaces',
    'Triple Cross CH Necklace from the NYx DRIPstore collection. Heavy industrial cross layered chains in blackened chrome finish.',
    349.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/triple cross/IMG-20261002-WA0000.jpg',
        '/nyxdrip/triple cross/IMG-20261002-WA0002.jpg',
        '/nyxdrip/triple cross/IMG-20261002-WA0014.jpg'
    ]::TEXT[]
),
-- 2. Y2K Glass — ₹149
(
    'y2k-glass',
    'Y2K Glass',
    'Accessories',
    'Y2K Glass from the NYx DRIPstore collection. Futuristic cyber aesthetic eyewear accessory.',
    149.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Y2k Glass/y2k-glass.jpg'
    ]::TEXT[]
),
-- 3. Black Metallic Wallet — ₹449
(
    'black-metallic-wallet',
    'Black Metallic Wallet',
    'Wallets',
    'Black Metallic Wallet from the NYx DRIPstore collection. Sleek metallic cyber hardware finish.',
    449.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Black Merttalic Wallet/IMG-20261002-WA0001.jpg',
        '/nyxdrip/Black Merttalic Wallet/IMG-20261002-WA0005.jpg'
    ]::TEXT[]
),
-- 4. Angel Creed Necklace — ₹399
(
    'angel-creed-necklace',
    'Angel Creed Necklace',
    'Necklaces',
    'Angel Creed Necklace from the NYx DRIPstore collection. Sculpted gothic wing and cross insignia.',
    399.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Angle creed necklace/IMG-20261002-WA0008.jpg',
        '/nyxdrip/Angle creed necklace/IMG-20261002-WA0034.jpg',
        '/nyxdrip/Angle creed necklace/IMG-20261002-WA0013.jpg'
    ]::TEXT[]
),
-- 5. CH Bracelet — ₹200
(
    'ch-bracelet',
    'CH Bracelet',
    'Bracelets',
    'CH Bracelet from the NYx DRIPstore collection. Heavy gothic link hardware bracelet.',
    200.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Ch bracelete 1.0/IMG-20261002-WA0006.jpg',
        '/nyxdrip/Ch bracelete 1.0/IMG-20261002-WA0040.jpg'
    ]::TEXT[]
),
-- 6. Royal Fleur Studs — ₹99 (1 PC)
(
    'royal-fleur-studs',
    'Royal Fleur Studs',
    'Studs / Earrings',
    'Royal Fleur Studs from the NYx DRIPstore collection. Price is for 1 PC (Single Piece). Intricate sculpted silver fleur hardware.',
    99.00,
    NULL,
    false,
    '1 PC',
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0011.jpg',
        '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0035.jpg',
        '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0038.jpg'
    ]::TEXT[]
),
-- 7. Y2K Cap — ₹199
(
    'y2k-cap',
    'Y2K Cap',
    'Caps',
    'Y2K Cap from the NYx DRIPstore collection. Dark streetwear headwear featuring signature sculptural horns.',
    199.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Y2k Devil Cap/IMG-20261002-WA0039.jpg'
    ]::TEXT[]
),
-- 8. CH Pendant — ₹169
(
    'ch-pendant',
    'CH Pendant',
    'Pendants',
    'CH Pendant from the NYx DRIPstore collection. Sculpted gothic cross centerpiece.',
    169.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip2.0/Ch pendent/file_000000008d208210a4fb4b6cb8b9613b.png'
    ]::TEXT[]
),
-- 9. Red Cross Pendant — ₹159
(
    'red-cross-pendant',
    'Red Cross Pendant',
    'Pendants',
    'Red Cross Pendant from the NYx DRIPstore collection. Crimson accent chrome cross pendant.',
    159.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip2.0/red cross pendent/file_00000000ccc081f48693e3f5597033c2.png'
    ]::TEXT[]
),
-- 10. Double Cross Pendant — ₹149
(
    'double-cross-pendant',
    'Double Cross Pendant',
    'Pendants',
    'Double Cross Pendant from the NYx DRIPstore collection. Interlocking double cross motif.',
    149.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip2.0/Double cross pendent/file_00000000f2a082108e6a99793e3bbfff.png',
        '/nyxdripscreenshot/Double cross pendent/IMG_20261002_125433_250.jpg'
    ]::TEXT[]
),
-- 11. Berserk Pendant — ₹149
(
    'berserk-pendant',
    'Berserk Pendant',
    'Pendants',
    'Berserk Pendant from the NYx DRIPstore collection. Dark fantasy emblem hardware.',
    149.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip2.0/Bersek pendent/file_00000000669c82108310d8a5f6ca67a5.png'
    ]::TEXT[]
),
-- 12. Blue Metallic Wallet — ₹449
(
    'blue-metallic-wallet',
    'Blue Metallic Wallet',
    'Wallets',
    'Blue Metallic Wallet from the NYx DRIPstore collection. Deep cobalt metallic sheen cyber finish.',
    449.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0029.jpg',
        '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0030.jpg',
        '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0033.jpg'
    ]::TEXT[]
),
-- 13. Red Cosmic Star Necklace — ₹299
(
    'red-cosmic-star-necklace',
    'Red Cosmic Star Necklace',
    'Necklaces',
    'Red Cosmic Star Necklace from the NYx DRIPstore collection. Celestial star motif with blood red core.',
    299.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Red Cosmic Star Necklace/IMG-20261002-WA0031.jpg',
        '/nyxdrip/Red Cosmic Star Necklace/IMG-20261002-WA0032.jpg'
    ]::TEXT[]
),
-- 14. Y2K Heart Necklace — ₹299
(
    'y2k-heart-necklace',
    'Y2K Heart Necklace',
    'Necklaces',
    'Y2K Heart Necklace from the NYx DRIPstore collection. Cyber barbed chrome heart silhouette.',
    299.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip/Y2k heart Necklace/IMG-20261002-WA0041.jpg',
        '/nyxdrip/Y2k heart Necklace/IMG-20261002-WA0042.jpg'
    ]::TEXT[]
),
-- 15. Snake Cross Necklace — ₹299
(
    'snake-cross-necklace',
    'Snake Cross Necklace',
    'Necklaces',
    'Snake Cross Necklace from the NYx DRIPstore collection. Serpentine chrome cross entwined chain.',
    299.00,
    NULL,
    false,
    NULL,
    10,
    true,
    true,
    ARRAY[
        '/nyxdrip2.0/Snake cross nekclace/IMG_20261002_125440_660.jpg'
    ]::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = NULL,
    price_is_placeholder = false,
    piece_unit = EXCLUDED.piece_unit,
    is_active = true,
    is_new_arrival = true,
    images = CASE WHEN array_length(EXCLUDED.images, 1) > 0 THEN EXCLUDED.images ELSE public.products.images END,
    updated_at = now();

-- ----------------------------------------------------------------------------
-- STEP 5: VERIFICATION QUERY
-- ----------------------------------------------------------------------------
SELECT 
    id,
    slug,
    name,
    category,
    price,
    piece_unit,
    is_active,
    array_length(images, 1) as image_count
FROM public.products
WHERE is_active = true
ORDER BY price ASC;
