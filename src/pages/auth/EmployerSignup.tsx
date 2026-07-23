import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { PayFrequency, PayMethod } from '../../types';
import { PRESET_SECURITY_QUESTIONS } from '../../lib/securityQuestions';
import '../../styles/auth.css';

export default function EmployerSignup() {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('biweekly');
  const [payMethod, setPayMethod] = useState<PayMethod>('direct_deposit');

  const [q1, setQ1] = useState(PRESET_SECURITY_QUESTIONS[0]);
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState(PRESET_SECURITY_QUESTIONS[1]);
  const [a2, setA2] = useState('');
  const [q3Custom, setQ3Custom] = useState('');
  const [a3, setA3] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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
          pending_role: 'employer',
          full_name: fullName,
          company_name: companyName,
          pay_frequency: payFrequency,
          pay_method: payMethod,
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Employer sign up</h1>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Full name</label>
            <input placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Company name</label>
            <input placeholder="Your company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Email</label>
            <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
            <label>Pay frequency (cannot be changed later)</label>
            <select value={payFrequency} onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="auth-field">
            <label>Pay method (cannot be changed later)</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PayMethod)}>
              <option value="direct_deposit">Direct deposit</option>
              <option value="cheque">Cheque</option>
            </select>
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
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="auth-links">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}