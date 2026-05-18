'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function LoginForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'navigating'>('idle');
  const [debug, setDebug] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebug('Starting sign-in…');
    setPhase('submitting');

    if (!SUPABASE_URL || !SUPABASE_ANON) {
      setError('Supabase env vars missing in the build.');
      setPhase('idle');
      return;
    }

    // Build a fresh browser client right here — no shared state with AuthContext
    // or any other module. This rules out wrapper bugs as the cause of hangs.
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON);

    let result: { error: { message: string } | null } | null = null;
    try {
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout_8s')), 8000),
      );
      const winner = await Promise.race([signInPromise, timeout]);
      result = winner as Awaited<typeof signInPromise>;
      setDebug('Supabase responded. Checking result…');
    } catch (e: any) {
      setError(
        e?.message === 'timeout_8s'
          ? 'Sign-in stalled at the Supabase Auth endpoint after 8 s. Refresh and retry; if it keeps happening let me know.'
          : (e?.message ?? String(e)),
      );
      setPhase('idle');
      return;
    }

    if (result?.error) {
      setError(result.error.message);
      setPhase('idle');
      return;
    }

    setPhase('navigating');
    setDebug('Sign-in succeeded. Navigating…');

    // Give @supabase/ssr's cookie writes one tick to land, then hard-navigate
    // so middleware sees the freshly-set session.
    setTimeout(() => {
      window.location.assign(returnUrl);
    }, 50);
  };

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-8 flex justify-center">
        <Image src="/logo.png" alt="LevelUp Wrestling" width={180} height={67} className="h-12 w-auto" priority />
      </Link>

      <h1 className="mb-2 text-center text-2xl font-heading font-bold tracking-tight">Welcome back</h1>
      <p className="mb-8 text-center text-sm text-zinc-400">Sign in to your LevelUp account</p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
          <input
            id="email" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">Password</label>
          <input
            id="password" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Enter your password"
          />
        </div>

        <div className="flex justify-end">
          <Link href="/reset-password" className="text-sm text-[#2563EB] hover:text-[#2563EB]/80 transition-colors">Forgot password?</Link>
        </div>

        <button
          type="submit"
          disabled={phase !== 'idle'}
          className="w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-[#2563EB]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {phase === 'submitting' ? 'Signing in…' : phase === 'navigating' ? 'Loading dashboard…' : 'Sign In'}
        </button>

        {debug && phase !== 'idle' && (
          <p className="text-xs text-zinc-500 text-center">{debug}</p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#2563EB] hover:text-[#2563EB]/80 transition-colors font-medium">Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
