import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Extracts and verifies the caller's JWT token from the Authorization header.
 * Derives user_id securely from the JWT, never from request payload.
 */
export const getAuthenticatedUser = async (
  req: Request,
  supabaseAdmin: SupabaseClient
): Promise<AuthenticatedUser> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('UNAUTHORIZED: Missing Authorization header');
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw new Error('UNAUTHORIZED: Invalid Bearer token');
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    throw new Error('UNAUTHORIZED: Session expired or invalid token');
  }

  return {
    id: user.id,
    email: user.email || '',
  };
};

/**
 * Extracts and verifies the caller's JWT token if provided.
 * Returns AuthenticatedUser if valid session exists, or null for Guest checkout.
 */
export const getOptionalUser = async (
  req: Request,
  supabaseAdmin: SupabaseClient
): Promise<AuthenticatedUser | null> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return {
      id: user.id,
      email: user.email || '',
    };
  } catch {
    return null;
  }
};
