'use client';

import { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: '0%' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
  if (score <= 3) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
  return { label: 'Strong', color: 'bg-green-500', width: '100%' };
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/onboarding';
  const { signUp, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);

    // Sign up with default role — onboarding wizard will collect role & name
    const { error: signUpError } = await signUp(email, password, 'athlete', '');

    if (signUpError) {
      setError(signUpError);
      setSubmitting(false);
      return;
    }

    router.push(returnUrl);
  };

  return (
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
        Create your account
      </h1>
      <p className="mb-8 text-center text-sm text-zinc-400">
        Start your LevelUp wrestling journey
      </p>

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

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 pr-12 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Password strength indicator */}
          {password && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-zinc-800">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <p className={`mt-1 text-xs ${
                strength.label === 'Weak' ? 'text-red-400' :
                strength.label === 'Medium' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || authLoading}
          className="w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-[#2563EB]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="text-[#2563EB] hover:text-[#2563EB]/80 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
