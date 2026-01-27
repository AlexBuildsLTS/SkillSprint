import { createClient, User } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function ensureAdmin(req: Request): Promise<User> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new AdminAuthError('Missing Authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError) {
    throw new AdminAuthError('Invalid token', 401);
  }
  if (!user) {
    throw new AdminAuthError('User not found', 404);
  }

  const { data: callerProfile, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (pErr) {
    console.error('Error fetching caller profile:', pErr);
    throw new AdminAuthError('Failed to fetch caller profile', 500);
  }
  if (callerProfile?.role !== 'admin') {
    throw new AdminAuthError('Forbidden', 403);
  }

  return user;
}
