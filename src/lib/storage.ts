import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Resolves product image URLs.
 * If the path is stored on Supabase Storage, returns the generated public CDN URL.
 * If it's a local static path or external URL, preserves it as a fallback.
 */
export const getProductImageUrl = (imagePath: string | null | undefined, fallback: string): string => {
  if (!imagePath) return fallback;

  // External URLs (e.g. Unsplash or Cloudflare R2)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Data URLs or local bundle assets
  if (imagePath.startsWith('data:') || imagePath.startsWith('/assets/') || imagePath.startsWith('blob:')) {
    return imagePath;
  }

  // If Supabase Storage path (e.g. 'pendants/chrome-cross.jpg')
  if (isSupabaseConfigured) {
    const { data } = supabase.storage.from('products').getPublicUrl(imagePath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  return fallback;
};

/**
 * Storage upload helper for Admin Area.
 * Uploads an image to the 'products' bucket under subfolder category.
 */
export const uploadProductImage = async (
  file: File,
  folder: 'pendants' | 'bracelets' | 'chains' | 'rings' | 'wallets' | 'accessories' = 'accessories'
): Promise<{ path: string | null; error: string | null }> => {
  if (!isSupabaseConfigured) {
    return { path: null, error: 'Supabase is not configured yet.' };
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      return { path: null, error: uploadError.message };
    }

    return { path: filePath, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return { path: null, error: msg };
  }
};
