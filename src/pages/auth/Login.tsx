import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { finalizeSignup } from '../../lib/finalizeSignup';
import '../../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  async function resolveProfileAndRedirect(
    userId: string,
    userEmail: string,
    userMetadata: Record<string, unknown>,
    options: { silent?: boolean } = {}
  ) {
    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      const { error: finalizeError } = await finalizeSignup(userId, userEmail, userMetadata);
      if (finalizeError) {
        if (options.silent) {
          await supabase.auth.signOut();
          return false;
        }
        setError('Could not finish setting up your account: ' + finalizeError);
        return false;
      }

      const retry = await supabase.from('users').select('role').eq('id', userId).single();
      profile = retry.data;
      profileError = retry.error;
    }

    if (profileError || !profile) {
      if (options.silent) {
        await supabase.auth.signOut();
        return false;
      }
      setError('Could not load your profile. Please try again.');
      return false;
    }

    if (profile.role === 'employer') navigate('/employer');
    else if (profile.role === 'employee') navigate('/employee');
    else if (profile.role === 'super_admin') navigate('/admin');
    else navigate('/login');
    return true;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (user) {
        await resolveProfileAndRedirect(user.id, user.email ?? '', user.user_metadata ?? {}, { silent: true });
      }
      setCheckingSession(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError(authError?.message ?? 'Login failed');
      setLoading(false);
      return;
    }

    await resolveProfileAndRedirect(data.user.id, data.user.email ?? '', data.user.user_metadata ?? {});
    setLoading(false);
  }

  if (checkingSession) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Log in</h1>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="auth-links">
          <p><Link to="/forgot-password">Forgot password?</Link></p>
          <p>New employer? <Link to="/signup/employer">Sign up</Link></p>
          <p>Have an invite code? <Link to="/signup/employee">Join as employee</Link></p>
        </div>
      </div>
    </div>
  );
}