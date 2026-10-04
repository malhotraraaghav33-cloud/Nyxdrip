import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Product } from '../types';
import { PRODUCTS, CATEGORIES_DATA, SLUG_ALIASES } from '../data/products';
import { getProductImages } from '../lib/productImage';

let cachedProducts: Product[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute client cache

/**
 * Transforms Supabase database row to frontend Product type
 */
export const mapDbProductToFrontend = (row: any): Product => {
  const resolvedImages = getProductImages({
    images: Array.isArray(row.images) ? row.images : [],
    slug: row.slug,
    category: row.category || row.category_name,
  });

  const priceNum = Number(row.price || 0);
  const isPlaceholderPrice = Boolean(row.price_is_placeholder || priceNum === 0);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: priceNum,
    priceIsPlaceholder: isPlaceholderPrice,
    pieceUnit: row.piece_unit || (row.slug === 'royal-fleur-studs' ? '1 PC' : undefined),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    category: (row.category || row.category_name || 'Necklaces') as any,
    description: row.description || `[Placeholder — description to be updated] ${row.name} from the NYx DRIPstore collection.`,
    images: resolvedImages,
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : undefined,
    reviewCount: row.review_count ? Number(row.review_count) : 0,
    stock: row.stock !== null && row.stock !== undefined ? Number(row.stock) : 10,
    tags: Array.isArray(row.tags) ? row.tags : [],
    badge: row.badge || undefined,
    style: row.style || undefined,
    color: Array.isArray(row.colors) && row.colors[0] ? row.colors[0] : (typeof row.color === 'string' ? row.color : undefined),
    materials: row.materials || undefined,
    careInstructions: row.care_instructions || undefined,
    variants: row.variants || undefined,
    isNewArrival: Boolean(row.is_new_arrival),
    isBestSeller: Boolean(row.is_best_seller),
  };
};

/**
 * Fetches all products from Supabase `products` table with memory cache and local fallback.
 */
export const fetchAllProducts = async (forceRefresh = false): Promise<Product[]> => {
  const now = Date.now();
  if (!forceRefresh && cachedProducts && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedProducts;
  }

  if (!isSupabaseConfigured) {
    cachedProducts = PRODUCTS;
    lastFetchTime = now;
    return PRODUCTS;
  }

  try {
    // 1. Try querying active products
    let query = supabase
      .from('products')
      .select('*');

    // Only apply is_active filter if column exists
    const { data, error } = await query
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data.map(mapDbProductToFrontend);
      cachedProducts = mapped;
      lastFetchTime = now;
      return mapped;
    }

    // 2. If is_active column error or empty, fall back cleanly to local real catalog
    console.info('Supabase products table returned empty or unmigrated. Using local catalog fallback.');
    cachedProducts = PRODUCTS;
    lastFetchTime = now;
    return PRODUCTS;
  } catch (err) {
    console.warn('Network error fetching Supabase products. Falling back to local catalog:', err);
    cachedProducts = PRODUCTS;
    lastFetchTime = now;
    return PRODUCTS;
  }
};

/**
 * Fetches a single product by slug or ID with fallback
 */
export const fetchProductBySlug = async (rawSlug: string): Promise<Product | null> => {
  if (!rawSlug) return null;
  const slug = SLUG_ALIASES[rawSlug] || rawSlug;

  // Check cache first
  if (cachedProducts) {
    const found = cachedProducts.find((p) => p.slug === slug || p.id === slug);
    if (found) return found;
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .maybeSingle();

      if (!error && data) {
        return mapDbProductToFrontend(data);
      }
    } catch {
      // Fallback below
    }
  }

  // Local fallback
  return PRODUCTS.find((p) => p.slug === slug || p.id === slug) || null;
};

/**
 * Fetches categories from Supabase `categories` table with fallback to CATEGORIES_DATA
 */
export const fetchCategories = async () => {
  if (!isSupabaseConfigured) return CATEGORIES_DATA;

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return CATEGORIES_DATA;
    }

    return data.map((c) => ({
      name: c.name,
      slug: c.slug,
      image: c.image_url || CATEGORIES_DATA.find((x) => x.slug === c.slug)?.image || '/assets/products/placeholder.svg',
      description: c.description || '',
      count: c.count || 1,
    }));
  } catch {
    return CATEGORIES_DATA;
  }
};
