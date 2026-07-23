import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import '../../styles/auth.css';

interface QuestionRow {
  question_id: string;
  question_text: string;
}

export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'question' | 'done' | 'failed'>('email');
  const [email, setEmail] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc('get_security_questions_by_email', {
      p_email: email,
    });

    setLoading(false);

    if (rpcError || !data || data.length === 0) {
      setError('No account found for that email.');
      return;
    }

    setQuestions(data as QuestionRow[]);
    setCurrentIndex(0);
    setAnswer('');
    setStep('question');
  }

  async function handleAnswerSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const currentQuestion = questions[currentIndex];

    const { data: correct, error: verifyError } = await supabase.rpc(
      'verify_single_security_answer',
      { p_question_id: currentQuestion.question_id, p_answer: answer }
    );

    if (verifyError) {
      setLoading(false);
      setError('Something went wrong. Please try again.');
      return;
    }

    if (correct) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      setLoading(false);

      if (resetError) {
        setError('Could not send reset email: ' + resetError.message);
        return;
      }

      setStep('done');
      return;
    }

    setLoading(false);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setStep('failed');
      return;
    }

    setCurrentIndex(nextIndex);
    setAnswer('');
    setError("That wasn't right. Try the next question.");
  }

  if (step === 'done') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Check your email</h1>
          <p style={{ textAlign: 'center', color: '#5b5d78', fontSize: 14 }}>
            We verified your answer and sent a password reset link to <strong>{email}</strong>.
          </p>
          <div className="auth-links">
            <p><Link to="/login">Back to login</Link></p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'failed') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">We couldn't verify you</h1>
          <p style={{ textAlign: 'center', color: '#5b5d78', fontSize: 14 }}>
            None of your answers matched. Please try again later or contact support.
          </p>
          <div className="auth-links">
            <p><Link to="/login">Back to login</Link></p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'question') {
    const currentQuestion = questions[currentIndex];
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Verify your identity</h1>
          <form onSubmit={handleAnswerSubmit}>
            <div className="auth-field">
              <label>{currentQuestion.question_text}</label>
              <input
                placeholder="Your answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? 'Checking...' : 'Submit answer'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Forgot password</h1>
        <form onSubmit={handleEmailSubmit}>
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

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Looking up...' : 'Continue'}
          </button>
        </form>

        <div className="auth-links">
          <p><Link to="/login">Back to login</Link></p>
        </div>
      </div>
    </div>
  );
}