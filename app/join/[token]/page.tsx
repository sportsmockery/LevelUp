'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Loader2, CheckCircle, XCircle, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type ValidationResult =
  | { valid: true; clubId: string; clubName: string }
  | { valid: false; error: string };

type JoinState = 'idle' | 'joining' | 'success' | 'error';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, loading: authLoading } = useAuth();

  const [validating, setValidating] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [joinState, setJoinState] = useState<JoinState>('idle');
  const [joinError, setJoinError] = useState('');
  const [joinType, setJoinType] = useState('');

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/club/invite/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setValidation(data);
      } catch {
        setValidation({ valid: false, error: 'Failed to validate invite link' });
      } finally {
        setValidating(false);
      }
    }
    validate();
  }, [token]);

  const handleJoin = async () => {
    setJoinState('joining');
    setJoinError('');
    try {
      const res = await fetch('/api/club/invite/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'Failed to join');
        setJoinState('error');
        return;
      }
      setJoinType(data.type);
      setJoinState('success');
    } catch {
      setJoinError('Network error. Please try again.');
      setJoinState('error');
    }
  };

  // Loading state
  if (validating || authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
        <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
        <p className="mt-4 text-sm text-zinc-400">Validating invite link...</p>
      </div>
    );
  }

  // Invalid token
  if (!validation || !validation.valid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="mb-2 text-xl font-heading font-bold">Invalid Invite</h1>
          <p className="mb-6 text-sm text-zinc-400">
            {!validation ? 'Something went wrong.' : validation.error}
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const { clubName } = validation;

  // Success state
  if (joinState === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="mb-2 text-xl font-heading font-bold">
            {joinType === 'athlete_joined' ? 'You\'re In!' : 'Request Sent!'}
          </h1>
          <p className="mb-6 text-sm text-zinc-400">
            {joinType === 'athlete_joined'
              ? `You've joined ${clubName}. Head to your dashboard to get started.`
              : `Your request to join ${clubName} has been sent. A coach or admin will approve you shortly.`}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-[#2563EB]/40 cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Not logged in — prompt to sign up or sign in
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="mb-6 flex justify-center">
            <Image
              src="/logo.png"
              alt="LevelUp Wrestling"
              width={180}
              height={67}
              className="h-12 w-auto"
              priority
            />
          </Link>

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#E91E8C]">
            <Shield className="w-7 h-7 text-white" />
          </div>

          <h1 className="mb-2 text-xl font-heading font-bold">
            You&apos;re invited to join
          </h1>
          <p className="mb-6 text-lg font-heading gradient-text">{clubName}</p>
          <p className="mb-8 text-sm text-zinc-400">
            Create an account or sign in to join this club on LevelUp.
          </p>

          <div className="space-y-3">
            <Link
              href={`/signup?returnUrl=/join/${token}`}
              className="block w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-[#2563EB]/40"
            >
              Create Account
            </Link>
            <Link
              href={`/login?returnUrl=/join/${token}`}
              className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in — show join prompt
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#E91E8C]">
          <Users className="w-7 h-7 text-white" />
        </div>

        <h1 className="mb-2 text-xl font-heading font-bold">
          Join {clubName}
        </h1>
        <p className="mb-8 text-sm text-zinc-400">
          You&apos;re signed in as <span className="text-white">{user.email}</span>.
          Tap below to join this club.
        </p>

        {joinState === 'error' && joinError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {joinError}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joinState === 'joining'}
          className="w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-[#2563EB]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {joinState === 'joining' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Joining...
            </span>
          ) : (
            'Join Club'
          )}
        </button>

        <p className="mt-4 text-xs text-zinc-500">
          Not you?{' '}
          <Link href={`/login?returnUrl=/join/${token}`} className="text-[#2563EB] hover:text-[#2563EB]/80 transition-colors">
            Sign in with a different account
          </Link>
        </p>
      </div>
    </div>
  );
}
