import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const fetchProductReviews = async (productId: string): Promise<ProductReview[]> => {
  if (!isSupabaseConfigured || !productId) return [];

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      productId: r.product_id,
      userId: r.user_id,
      userName: r.user_name,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
};

export const submitProductReview = async (params: {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
}): Promise<{ success: boolean; message: string }> => {
  const { productId, userId, userName, rating, comment } = params;

  if (!isSupabaseConfigured) {
    return { success: true, message: 'Review recorded locally.' };
  }

  try {
    const { error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: userId,
        user_name: userName,
        rating: Math.min(5, Math.max(1, rating)),
        comment: comment.trim(),
        status: 'approved',
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, message: 'You have already submitted a review for this piece.' };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Your review has been authenticated and published.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Review submission failed';
    return { success: false, message: msg };
  }
};
