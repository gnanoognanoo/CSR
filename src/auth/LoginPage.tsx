import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Label } from '../components';
import './auth.css';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verificationSentEmail, setVerificationSentEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { user, signIn, signUp, resendVerification, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/portal';

  // Handle URL hash fragments from Supabase confirmation callbacks
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const params = new URLSearchParams(hash.substring(1));
      
      const errorDesc = params.get('error_description');
      const errorCode = params.get('error_code');
      const type = params.get('type');

      if (errorDesc || errorCode) {
        let msg = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Email verification link is invalid or expired.';
        if (errorCode === 'otp_expired') {
          msg = 'Your verification link has expired. Please enter your email below to request a new confirmation link.';
        }
        setErrorMsg(msg);
        window.history.replaceState(null, '', window.location.pathname);
      } else if (type === 'signup') {
        setSuccessMsg('Email verified successfully! Welcome to the CSR Community. Accessing your portal…');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Redirect if user is logged in
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        navigate(from, { replace: true });
      }, successMsg ? 1200 : 0);
      return () => clearTimeout(timer);
    }
  }, [user, navigate, from, successMsg]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleResendEmail(targetEmail?: string) {
    const toSend = targetEmail || verificationSentEmail || email;
    if (!toSend) return;

    setResending(true);
    setErrorMsg(null);
    const res = await resendVerification(toSend);
    setResending(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Verification link re-sent to ${toSend}. Check your inbox and spam folder.`);
      setResendCooldown(60);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full name.');
          setSubmitting(false);
          return;
        }

        const res = await signUp(email, password, fullName);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.requiresVerification) {
          setVerificationSentEmail(res.email || email);
          setResendCooldown(60);
        } else {
          setSuccessMsg('Account created and signed in! Loading your portal…');
          navigate(from, { replace: true });
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Label>CSR-RIT / ACCESS GATEWAY</Label>
          <h1>
            {verificationSentEmail
              ? 'Verify Email'
              : isSignUp
              ? 'Create Account'
              : 'Portal Sign In'}
          </h1>
          <p>
            {verificationSentEmail
              ? 'Complete your registration to activate your CSR student engineer profile.'
              : isSignUp
              ? 'Join the CSR engineering community to manage your portfolio and division access.'
              : 'Sign in to access your member dashboard, division assets, and admin controls.'}
          </p>
        </div>

        {!isConfigured && (
          <div className="auth-alert error" style={{ marginBottom: '20px' }}>
            <div>
              <strong>Supabase not configured:</strong> Please configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
            </div>
          </div>
        )}

        {/* VERIFICATION SENT SCREEN */}
        {verificationSentEmail ? (
          <div className="verification-screen">
            <div className="verification-icon">✉</div>
            <h2 style={{ fontSize: '20px', margin: '0 0 10px' }}>Verification Email Sent</h2>
            <p className="body-copy" style={{ fontSize: '14px', margin: '0' }}>
              We've dispatched a secure confirmation link to:<br />
              <strong style={{ color: 'var(--white)', fontSize: '15px' }}>{verificationSentEmail}</strong>
            </p>

            <div className="verification-steps">
              <p><strong>1.</strong> Check your email inbox for a message from <strong>CSR-RIT</strong> (or Supabase Auth).</p>
              <p><strong>2.</strong> Click the <strong>Confirm your email</strong> link inside the message.</p>
              <p><strong>3.</strong> If you don't find it within 2 minutes, check your <strong>Spam / Junk folder</strong>.</p>
            </div>

            {errorMsg && (
              <div className="auth-alert error" style={{ marginBottom: '16px', textAlign: 'left' }} role="alert">
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert success" style={{ marginBottom: '16px', textAlign: 'left' }} role="status">
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="button"
              className="auth-btn-primary"
              disabled={resendCooldown > 0 || resending}
              onClick={() => handleResendEmail(verificationSentEmail)}
            >
              {resending ? 'Sending…' : resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Verification Email'}
            </button>

            <button
              type="button"
              className="outline-link"
              style={{ marginTop: '14px', width: '100%', textAlign: 'center', padding: '12px' }}
              onClick={() => { setVerificationSentEmail(null); setIsSignUp(false); setErrorMsg(null); }}
            >
              ← Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                className={`auth-tab ${!isSignUp ? 'is-active' : ''}`}
                onClick={() => { setIsSignUp(false); setErrorMsg(null); setSuccessMsg(null); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${isSignUp ? 'is-active' : ''}`}
                onClick={() => { setIsSignUp(true); setErrorMsg(null); setSuccessMsg(null); }}
              >
                Register
              </button>
            </div>

            {errorMsg && (
              <div className="auth-alert error" style={{ marginBottom: '20px' }} role="alert">
                <div style={{ flex: 1 }}>
                  <span>{errorMsg}</span>
                  {errorMsg.toLowerCase().includes('not verified') && email && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-admin"
                        style={{ fontSize: '10px', padding: '6px 12px' }}
                        disabled={resendCooldown > 0 || resending}
                        onClick={() => handleResendEmail(email)}
                      >
                        {resending ? 'Sending…' : resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Resend Verification Link'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert success" style={{ marginBottom: '20px' }} role="status">
                <span>{successMsg}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              {isSignUp && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-fullname">Full Name</label>
                  <input
                    id="auth-fullname"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Anto Jenishia A"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  className="form-input"
                  type="email"
                  placeholder="e.g. member@ritchennai.edu.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="auth-password">
                  Password
                </label>
                <input
                  id="auth-password"
                  className="form-input"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>

              <button
                type="submit"
                className="auth-btn-primary"
                disabled={submitting || !isConfigured}
              >
                {submitting ? 'Authenticating…' : isSignUp ? 'Create CSR Account' : 'Sign In to Portal'}
              </button>
            </form>

            <div className="auth-hint">
              <strong>Email Verification Note:</strong> When enabled in Supabase, check your inbox and click the confirmation link to verify your email.
            </div>
          </>
        )}

        <div className="auth-footer">
          <Link to="/">← Back to CSR-RIT</Link>
          <span className="mono">SECURED BY SUPABASE</span>
        </div>
      </div>
    </main>
  );
}

