import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { Button, Input } from '../components/ui/index.jsx';
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { referralService } from '../services/index.js';
import { getStoredRefCode, clearRefCode } from '../utils/referral.js';
import { fadeInUp } from '../lib/motion.js';

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    referralCode: getStoredRefCode() ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [codeStatus, setCodeStatus] = useState(null); // null | { valid, referrer_name }
  const debounceRef = useRef(null);

  // Debounced lookup when referral code changes
  useEffect(() => {
    const code = form.referralCode.trim();
    setCodeStatus(null);
    if (!code) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await referralService.lookup(code);
        setCodeStatus(result);
      } catch {
        setCodeStatus({ valid: false });
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [form.referralCode]);

  async function handleGoogleCredential(credential) {
    try {
      const refCode = getStoredRefCode();
      const data = await loginWithGoogle(credential, refCode || undefined);
      if (data.requires_totp) {
        // Unlikely for a brand-new account, but handle gracefully via Login page
        navigate('/login');
        return;
      }
      if (refCode) clearRefCode();
      toast.success('Welcome to UrbanPulse');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Google sign-up failed. Try again.');
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (form.password.length < 8) {
      return toast.error('Password must be at least 8 characters.');
    }
    setSubmitting(true);
    try {
      const refCode = form.referralCode.trim();
      await register(
        form.email,
        form.password,
        form.name,
        refCode || undefined,
      );
      if (refCode) clearRefCode();
      toast.success('Welcome to UrbanPulse');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  }

  const code = form.referralCode.trim();

  return (
    <>
      <Helmet>
        <title>Create account — UrbanPulse</title>
      </Helmet>
      <div className="container-site grid place-items-center py-12 md:py-20">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-md rounded-xl border border-border bg-surface p-8 md:p-10"
        >
          <h1 className="font-display text-h2 font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Track orders, save addresses, shop faster.</p>

          <div className="mt-6">
            <GoogleSignInButton text="signup_with" onCredential={handleGoogleCredential} />
          </div>

          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-border" />
            <span className="text-xs text-muted">or sign up with email</span>
            <hr className="flex-1 border-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              floating
              label="Name"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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
              autoComplete="new-password"
              hint="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div>
              <Input
                floating
                label="Referral code (optional)"
                value={form.referralCode}
                onChange={(e) =>
                  setForm({ ...form, referralCode: e.target.value.toUpperCase() })
                }
              />
              {code && codeStatus !== null && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    codeStatus.valid ? 'text-success' : 'text-error'
                  }`}
                >
                  {codeStatus.valid
                    ? `Valid — referred by ${codeStatus.referrer_name}`
                    : 'Invalid code'}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-hover">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}
