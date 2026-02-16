'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!supabase) {
      setError('Auth service unavailable. Please try again later.');
      setSubmitting(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });

    if (resetError) {
      setError(resetError.message);
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="LevelUp Wrestling"
            width={180}
            height={67}
            className="h-12 w-auto"
            priority
          />
        </Link>

        <h1 className="mb-2 text-center text-2xl font-heading font-bold tracking-tight">
          Reset your password
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-400">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {sent ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-4 text-center">
              <p className="text-sm font-medium text-green-400">Check your email</p>
              <p className="mt-1 text-xs text-green-400/70">
                We sent a password reset link to <span className="font-medium">{email}</span>
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-[#2563EB]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              <Link href="/login" className="text-[#2563EB] hover:text-[#2563EB]/80 transition-colors font-medium">
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
