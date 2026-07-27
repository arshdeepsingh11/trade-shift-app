import { supabase } from './supabaseClient';

export async function sendPasswordResetLink(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error: error?.message ?? null };
}