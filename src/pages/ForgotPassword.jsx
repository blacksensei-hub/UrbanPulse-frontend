import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { Button, Input } from '../components/ui/index.jsx';
import { authService } from '../services/index.js';
import { fadeInUp } from '../lib/motion.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      // Always show success — don't leak whether emails exist.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Forgot password \u2014 UrbanPulse</title>
      </Helmet>
      <div className="container-site grid place-items-center py-12 md:py-20">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-md rounded-xl border border-border bg-surface p-8 md:p-10"
        >
          <h1 className="font-display text-h2 font-bold">Reset your password</h1>
          {sent ? (
            <p className="mt-4 text-sm text-muted">
              If an account exists for that email, we\u2019ve sent a reset link. Check your inbox.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                Enter the email tied to your account and we\u2019ll send you a reset link.
              </p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <Input
                  label="Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" size="lg" className="w-full" loading={submitting}>
                  Send reset link
                </Button>
              </form>
            </>
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
