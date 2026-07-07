import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { Button, Input } from '../components/ui/index.jsx';
import { authService } from '../services/index.js';
import { fadeInUp } from '../lib/motion.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters.');
    setSubmitting(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Password reset \u2014 sign in with your new password.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Reset password \u2014 UrbanPulse</title>
      </Helmet>
      <div className="container-site grid place-items-center py-12 md:py-20">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-md rounded-xl border border-border bg-surface p-8 md:p-10"
        >
          <h1 className="font-display text-h2 font-bold">Set a new password</h1>
          {!token ? (
            <p className="mt-4 text-sm text-error">Invalid or missing reset token.</p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                hint="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                Reset password
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted">
            <Link to="/login" className="text-accent hover:text-accent-hover">
              Back to sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}
