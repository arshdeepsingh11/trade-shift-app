import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { PRESET_SECURITY_QUESTIONS } from '../../lib/securityQuestions';
import '../../styles/auth.css';

export default function EmployeeSignup() {
  const [inviteCode, setInviteCode] = useState('');
  const [inviteChecked, setInviteChecked] = useState(false);
  const [inviteValid, setInviteValid] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [payRate, setPayRate] = useState<number | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [q1, setQ1] = useState(PRESET_SECURITY_QUESTIONS[0]);
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState(PRESET_SECURITY_QUESTIONS[1]);
  const [a2, setA2] = useState('');
  const [q3Custom, setQ3Custom] = useState('');
  const [a3, setA3] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function checkInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: rpcError } = await supabase
      .rpc('get_invite_by_code', { code: inviteCode })
      .single();

    setLoading(false);

    if (rpcError || !data) {
      setError('Could not verify invite code.');
      return;
    }

    const invite = data as {
      employer_id: string;
      email: string;
      pay_rate: number;
      used: boolean;
      company_name: string;
    };

    if (invite.used) {
      setError('This invite code has already been used.');
      return;
    }

    setEmployerId(invite.employer_id);
    setEmail(invite.email);
    setPayRate(invite.pay_rate);
    setCompanyName(invite.company_name);
    setInviteValid(true);
    setInviteChecked(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!employerId || payRate === null) {
      setError('Invite not verified.');
      return;
    }
    if (q1 === q2) {
      setError('Please choose two different preset questions.');
      return;
    }
    if (!q3Custom.trim() || !a1.trim() || !a2.trim() || !a3.trim()) {
      setError('Please answer all 3 security questions.');
      return;
    }

    setLoading(true);

    const questionInputs = [
      { question_text: q1, answer: a1 },
      { question_text: q2, answer: a2 },
      { question_text: q3Custom, answer: a3 },
    ];

    const hashedQuestions: { question_text: string; answer_hash: string }[] = [];
    for (const q of questionInputs) {
      const { data: hash, error: hashError } = await supabase.rpc('hash_security_answer', {
        answer: q.answer,
      });
      if (hashError || !hash) {
        setError('Could not process security answers. Please try again.');
        setLoading(false);
        return;
      }
      hashedQuestions.push({ question_text: q.question_text, answer_hash: hash });
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          pending_role: 'employee',
          full_name: fullName,
          employer_id: employerId,
          pay_rate: payRate,
          invite_code: inviteCode,
          security_questions: hashedQuestions,
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Check your email</h1>
          <p style={{ textAlign: 'center', color: '#5b5d78', fontSize: 14 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate
            your account, then log in.
          </p>
          <div className="auth-links">
            <p><Link to="/login">Back to login</Link></p>
          </div>
        </div>
      </div>
    );
  }

  if (!inviteChecked) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Join as employee</h1>
          <form onSubmit={checkInvite}>
            <div className="auth-field">
              <label>Invite code</label>
              <input
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
          <div className="auth-links">
            <p><Link to="/login">Back to login</Link></p>
          </div>
        </div>
      </div>
    );
  }

  if (!inviteValid) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Join {companyName}</h1>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Full name</label>
            <input placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} readOnly />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="auth-field">
            <label>Security question 1</label>
            <select value={q1} onChange={(e) => setQ1(e.target.value)}>
              {PRESET_SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <input
              style={{ marginTop: 8 }}
              placeholder="Your answer"
              value={a1}
              onChange={(e) => setA1(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>Security question 2</label>
            <select value={q2} onChange={(e) => setQ2(e.target.value)}>
              {PRESET_SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <input
              style={{ marginTop: 8 }}
              placeholder="Your answer"
              value={a2}
              onChange={(e) => setA2(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>Security question 3 (write your own)</label>
            <input
              placeholder="e.g. What was your first car?"
              value={q3Custom}
              onChange={(e) => setQ3Custom(e.target.value)}
              required
            />
            <input
              style={{ marginTop: 8 }}
              placeholder="Your answer"
              value={a3}
              onChange={(e) => setA3(e.target.value)}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  );
}