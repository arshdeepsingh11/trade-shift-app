import { supabase } from './supabaseClient';

interface PendingSecurityQuestion {
  question_text: string;
  answer_hash: string;
}

interface PendingSignupMetadata {
  pending_role?: 'employer' | 'employee';
  full_name?: string;
  company_name?: string;
  pay_frequency?: string;
  pay_method?: string;
  employer_id?: string;
  pay_rate?: number;
  invite_code?: string;
  security_questions?: PendingSecurityQuestion[];
}

// Called once a confirmed user is authenticated but has no row in `users` yet.
// Reads the data that was stashed in auth user_metadata at signup time and
// creates the real profile + role-specific rows now that we have a session.
export async function finalizeSignup(
  userId: string,
  email: string,
  meta: PendingSignupMetadata
): Promise<{ error: string | null }> {
  if (!meta.pending_role) {
    return { error: 'No pending signup data found for this account.' };
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    role: meta.pending_role,
    full_name: meta.full_name ?? '',
    email,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  if (meta.pending_role === 'employer') {
    const { error: employerError } = await supabase.from('employers').insert({
      user_id: userId,
      company_name: meta.company_name ?? '',
      pay_frequency: meta.pay_frequency,
      pay_method: meta.pay_method,
      policy_locked: true,
    });
    if (employerError) return { error: employerError.message };
  }

  if (meta.pending_role === 'employee') {
    const { error: employeeError } = await supabase.from('employees').insert({
      user_id: userId,
      employer_id: meta.employer_id,
      pay_rate: meta.pay_rate,
    });
    if (employeeError) return { error: employeeError.message };

    if (meta.invite_code) {
      await supabase
        .from('employee_invites')
        .update({ used: true })
        .eq('invite_code', meta.invite_code);
    }
  }

  if (meta.security_questions) {
    for (const q of meta.security_questions) {
      const { error: sqError } = await supabase.from('security_questions').insert({
        user_id: userId,
        question_text: q.question_text,
        answer_hash: q.answer_hash,
      });
      if (sqError) return { error: sqError.message };
    }
  }

  return { error: null };
}