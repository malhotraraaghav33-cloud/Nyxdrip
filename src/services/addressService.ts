import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface UserAddress {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  street_address: string;
  apartment?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchUserAddresses = async (userId: string): Promise<UserAddress[]> => {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching addresses:', error.message);
      return [];
    }

    return (data as UserAddress[]) || [];
  } catch (err) {
    console.warn('Failed to load addresses:', err);
    return [];
  }
};

export const saveUserAddress = async (
  userId: string,
  address: Omit<UserAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<{ data: UserAddress | null; error: string | null }> => {
  if (!isSupabaseConfigured || !userId) {
    return { data: null, error: 'Database not available' };
  }

  try {
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: userId,
        full_name: address.full_name,
        phone: address.phone,
        street_address: address.street_address,
        apartment: address.apartment || null,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country || 'India',
        is_default: address.is_default || false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as UserAddress, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Save address error';
    return { data: null, error: msg };
  }
};

export const deleteUserAddress = async (userId: string, addressId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !userId) return false;

  try {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
};

export const setDefaultAddress = async (userId: string, addressId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !userId) return false;

  try {
    const { error } = await supabase
      .from('addresses')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', addressId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
};
