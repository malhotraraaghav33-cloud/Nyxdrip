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
 * Uploads an image to the 'products' bucket under subfolder category and returns both path and public CDN URL.
 */
export const uploadProductImage = async (
  file: File,
  folder: string = 'accessories'
): Promise<{ path: string | null; publicUrl: string | null; error: string | null }> => {
  if (!isSupabaseConfigured) {
    return { path: null, publicUrl: null, error: 'Supabase is not configured yet.' };
  }

  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanBaseName = file.name
      .substring(0, file.name.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 20);
    const fileName = `${Date.now()}_${cleanBaseName}.${fileExt}`;
    const cleanFolder = folder.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const filePath = `${cleanFolder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      return { path: null, publicUrl: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return { path: filePath, publicUrl: data?.publicUrl || null, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return { path: null, publicUrl: null, error: msg };
  }
};
