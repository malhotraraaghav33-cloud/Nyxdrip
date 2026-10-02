import { isSupabaseConfigured, supabase } from './supabaseClient';
import { Product } from '../types';

export const PRODUCT_PLACEHOLDER_IMAGE = '/assets/products/placeholder.svg';

/**
 * Maps category display name to standard assets/storage folder name.
 */
export const getCategoryFolder = (categoryName?: string): string => {
  if (!categoryName) return 'necklaces';
  const norm = categoryName.toLowerCase().trim();
  if (norm.includes('necklace') || norm.includes('chain')) return 'necklaces';
  if (norm.includes('pendant')) return 'pendants';
  if (norm.includes('bracelet')) return 'bracelets';
  if (norm.includes('stud') || norm.includes('earring')) return 'studs';
  if (norm.includes('wallet')) return 'wallets';
  if (norm.includes('cap') || norm.includes('hat')) return 'caps';
  return 'necklaces';
};

/**
 * Resolves a raw image identifier/path into a valid loadable URL:
 * 1. Absolute HTTP/HTTPS URLs (external or Supabase Storage public CDN)
 * 2. Static /assets/ paths (local public folder)
 * 3. Supabase Storage relative paths (e.g. "necklaces/triple-cross.jpg")
 * 4. Falls back to PRODUCT_PLACEHOLDER_IMAGE
 */
export const resolveProductImageUrl = (imagePath?: string | null): string => {
  if (!imagePath || typeof imagePath !== 'string') {
    return PRODUCT_PLACEHOLDER_IMAGE;
  }

  const trimmed = imagePath.trim();
  if (!trimmed) {
    return PRODUCT_PLACEHOLDER_IMAGE;
  }

  // Direct check for user uploaded photo filenames
  if (trimmed.startsWith('IMG-20261002-')) {
    return `/assets/products/necklaces/${trimmed}`;
  }

  // Already a full URL, absolute path, data URL, or blob
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    try {
      return encodeURI(decodeURI(trimmed));
    } catch {
      return trimmed;
    }
  }

  // Supabase Storage relative path inside 'products' bucket
  if (isSupabaseConfigured) {
    try {
      const { data } = supabase.storage.from('products').getPublicUrl(trimmed);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    } catch {
      // Proceed to fallback
    }
  }

  // If provided as a relative filename without leading slash, map to public assets
  return `/assets/products/${trimmed}`;
};

/**
 * Returns an array of resolved image URLs for a product.
 * Guarantees at least one valid image (the neutral placeholder).
 */
export const getProductImages = (
  product?: Partial<Product> | null
): string[] => {
  if (!product) return [PRODUCT_PLACEHOLDER_IMAGE];

  if (Array.isArray(product.images) && product.images.length > 0) {
    const resolved = product.images
      .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
      .map(resolveProductImageUrl);

    if (resolved.length > 0) {
      return resolved;
    }
  }

  return [PRODUCT_PLACEHOLDER_IMAGE];
};

/**
 * Returns the primary (first) image for a product, falling back to placeholder.
 */
export const getProductPrimaryImage = (
  product?: Partial<Product> | null
): string => {
  const images = getProductImages(product);
  return images[0] || PRODUCT_PLACEHOLDER_IMAGE;
};

/**
 * Returns the secondary image if available, or null.
 */
export const getProductSecondaryImage = (
  product?: Partial<Product> | null
): string | null => {
  const images = getProductImages(product);
  if (images.length > 1 && images[1] !== images[0] && images[1] !== PRODUCT_PLACEHOLDER_IMAGE) {
    return images[1];
  }
  return null;
};
