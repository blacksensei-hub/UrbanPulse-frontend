import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { ArrowLeft, Info } from 'lucide-react';

import { Button, Input } from '../components/ui/index.jsx';
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { authService } from '../services/index.js';
import { setSessionHint } from '../utils/sessionHint.js';
import { fadeInUp } from '../lib/motion.js';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const notice = searchParams.get('notice');
  const { setUser, login, loginWithGoogle } = useAuthStore();

  // Honor `next` when present, except a non-admin landing on an admin `next`
  // would just bounce straight back to this same wrong-account redirect —
  // fall through to the normal role-based destination instead.
  function destinationFor(user) {
    if (next && !(next.startsWith('/admin') && user.role !== 'admin')) return next;
    return user.role === 'admin' ? '/admin' : '/';
  }

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  // TOTP step state
  const [step, setStep] = useState('credentials'); // 'credentials' | 'totp'
  const [challengeToken, setChallengeToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const totpInputRef = useRef(null);

  useEffect(() => {
    if (step === 'totp') totpInputRef.current?.focus();
  }, [step]);

  async function handleGoogleCredential(credential) {
    setSubmitting(true);
    try {
      const data = await loginWithGoogle(credential);
      if (data.requires_totp) {
        setChallengeToken(data.challenge_token);
        setStep('totp');
      } else if (data.user) {
        toast.success('Welcome back');
        navigate(destinationFor(data.user));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Google sign-in failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCredentials(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Go through the store's login action (not authService directly) — it's
      // the one place that sets the session hint alongside the user, same as
      // loginWithGoogle below. Calling authService.login() directly here was
      // the bug: it set the user but never the hint, so refresh saw no hint,
      // skipped /auth/me entirely, and resolved logged-out.
      const data = await login(form.email, form.password);
      if (data.requires_totp) {
        setChallengeToken(data.challenge_token);
        setStep('totp');
      } else if (data.user) {
        toast.success('Welcome back');
        navigate(destinationFor(data.user));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTotp() {
    const maxLen = useRecovery ? 8 : 6;
    if (totpCode.length < maxLen) return;
    setSubmitting(true);
    try {
      const data = await authService.verifyTotp({ challenge_token: challengeToken, code: totpCode });
      setUser(data.user);
      setSessionHint();
      toast.success('Welcome back');
      navigate(destinationFor(data.user));
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Invalid code');
      setTotpCode('');
      totpInputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function handleTotpChange(e) {
    const val = e.target.value.replace(/\s/g, '').toUpperCase();
    const maxLen = useRecovery ? 8 : 6;
    const trimmed = val.slice(0, maxLen);
    setTotpCode(trimmed);
    // Auto-submit when 6-digit TOTP is complete (not for recovery codes)
    if (!useRecovery && trimmed.length === 6) {
      setTimeout(submitTotp, 50);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign in — UrbanPulse</title>
      </Helmet>
      <div className="container-site grid place-items-center py-12 md:py-20">
        <AnimatePresence mode="wait">
          {step === 'credentials' ? (
            <motion.div
              key="credentials"
              variants={fadeInUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-md rounded-xl border border-border bg-surface p-8 md:p-10"
            >
              <h1 className="font-display text-h2 font-bold">Sign in</h1>
              <p className="mt-2 text-sm text-muted">Good to have you back.</p>

              {notice === 'wrong-account' && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-highlight px-3 py-2.5 text-xs text-muted">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>You&apos;re signed in as a different account. Sign in with an admin account to continue.</span>
                </div>
              )}

              <div className="mt-6">
                <GoogleSignInButton text="signin_with" onCredential={handleGoogleCredential} />
              </div>

              <div className="my-6 flex items-center gap-3">
                <hr className="flex-1 border-border" />
                <span className="text-xs text-muted">or</span>
                <hr className="flex-1 border-border" />
              </div>

              <form onSubmit={submitCredentials} className="space-y-4">
                <Input
                  floating
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  floating
                  label="Password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-muted hover:text-text">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" size="lg" className="w-full" loading={submitting}>
                  Sign in
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-accent hover:text-accent-hover">
                  Create one
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="totp"
              variants={fadeInUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-md rounded-xl border border-border bg-surface p-8 md:p-10"
            >
              <button
                onClick={() => { setStep('credentials'); setTotpCode(''); setUseRecovery(false); }}
                className="mb-6 flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <h1 className="font-display text-h2 font-bold">Two-factor authentication</h1>
              <p className="mt-2 text-sm text-muted">
                {useRecovery
                  ? 'Enter one of your 8-character recovery codes.'
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>

              <div className="mt-7 space-y-4">
                <input
                  ref={totpInputRef}
                  type="text"
                  inputMode={useRecovery ? 'text' : 'numeric'}
                  maxLength={useRecovery ? 8 : 6}
                  value={totpCode}
                  onChange={handleTotpChange}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitTotp(); }}
                  placeholder={useRecovery ? 'XXXXXXXX' : '000000'}
                  autoComplete="one-time-code"
                  disabled={submitting}
                  className={`w-full rounded-xl border border-border bg-bg px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.4em] focus:border-accent focus:outline-none transition-colors ${submitting ? 'opacity-50' : ''}`}
                />

                <Button
                  size="lg"
                  className="w-full"
                  loading={submitting}
                  onClick={submitTotp}
                  disabled={totpCode.length < (useRecovery ? 8 : 6)}
                >
                  Verify
                </Button>

                <button
                  type="button"
                  onClick={() => { setUseRecovery((v) => !v); setTotpCode(''); totpInputRef.current?.focus(); }}
                  className="w-full text-center text-xs text-muted hover:text-text transition-colors"
                >
                  {useRecovery ? 'Use authenticator app instead' : 'Use a recovery code instead'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
