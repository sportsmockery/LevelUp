'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronDown, Clock, Trophy, BarChart3, User,
  Loader2, Shield, TrendingUp,
} from 'lucide-react';

type Connection = {
  connectionId: string;
  status: string;
  relationship: string;
  requestedAt: string;
  approvedAt: string | null;
  athlete: { id: string; name: string; club: string | null } | null;
  clubName: string | null;
};

type Match = {
  id: string;
  createdAt: string;
  opponentName: string | null;
  matchResult: string | null;
  resultType: string | null;
  overallScore: number;
  standing: number;
  top: number;
  bottom: number;
  competitionName: string | null;
  weightClass: string | null;
};

export default function ParentDashboard() {
  const { profile, loading: authLoading } = useAuth();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const approvedConnections = connections.filter((c) => c.status === 'approved' && c.athlete);
  const pendingConnections = connections.filter((c) => c.status === 'pending');
  const selectedAthlete = approvedConnections.find((c) => c.athlete?.id === selectedAthleteId);

  // Fetch connections
  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch('/api/family/connections');
        const data = await res.json();
        setConnections(data.connections || []);

        // Auto-select first approved athlete
        const firstApproved = (data.connections || []).find(
          (c: Connection) => c.status === 'approved' && c.athlete,
        );
        if (firstApproved?.athlete) {
          setSelectedAthleteId(firstApproved.athlete.id);
        }
      } catch {
        // Fail silently
      } finally {
        setLoadingConnections(false);
      }
    }
    fetchConnections();
  }, []);

  // Fetch matches when selected athlete changes
  useEffect(() => {
    if (!selectedAthleteId) return;

    async function fetchMatches() {
      setLoadingMatches(true);
      try {
        const res = await fetch(
          `/api/match-history?userId=${selectedAthleteId}&limit=10`,
        );
        const data = await res.json();
        setMatches(data.matches || []);
      } catch {
        setMatches([]);
      } finally {
        setLoadingMatches(false);
      }
    }
    fetchMatches();
  }, [selectedAthleteId]);

  // Compute stats
  const wins = matches.filter((m) => m.matchResult === 'win' || m.matchResult === 'W').length;
  const losses = matches.filter((m) => m.matchResult === 'loss' || m.matchResult === 'L').length;
  const avgScore = matches.length > 0
    ? Math.round(matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length)
    : 0;

  if (authLoading || loadingConnections) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  const parentName = profile?.full_name || 'Parent';

  // No approved connections
  if (approvedConnections.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
        <div className="mx-auto max-w-lg">
          <Link href="/" className="mb-8 flex justify-center">
            <Image
              src="/logo.png"
              alt="LevelUp Wrestling"
              width={160}
              height={60}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <h1 className="mb-2 text-2xl font-heading font-bold">
            Welcome, {parentName}
          </h1>
          <p className="mb-8 text-sm text-zinc-400">
            You don&apos;t have any connected athletes yet.
          </p>

          {pendingConnections.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-zinc-400">
                PENDING CONNECTION REQUESTS
              </h2>
              <div className="space-y-2">
                {pendingConnections.map((conn) => (
                  <div
                    key={conn.connectionId}
                    className="flex items-center justify-between rounded-2xl bg-zinc-900 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                        <User className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {conn.clubName || 'Club Connection'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Requested {new Date(conn.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1">
                      <Clock className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Waiting for approval</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingConnections.length === 0 && (
            <div className="rounded-2xl bg-zinc-900 p-6 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
              <p className="text-sm text-zinc-400">
                Ask your athlete&apos;s coach for an invite link to connect your account.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Has approved connections — show dashboard
  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-8">
      {/* Header */}
      <div className="border-b border-zinc-800 p-6">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-heading font-bold">Parent Dashboard</h1>
              <p className="text-sm text-zinc-400">{parentName}</p>
            </div>
            <Link href="/">
              <Image
                src="/logo.png"
                alt="LevelUp"
                width={100}
                height={37}
                className="h-7 w-auto"
              />
            </Link>
          </div>

          {/* Athlete Switcher */}
          {approvedConnections.length > 1 && (
            <div className="relative mt-4">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex w-full items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C]">
                    <span className="text-xs font-bold text-white">
                      {(selectedAthlete?.athlete?.name || '?')[0]}
                    </span>
                  </div>
                  <span className="font-medium">{selectedAthlete?.athlete?.name}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-lg">
                  {approvedConnections.map((conn) => (
                    <button
                      key={conn.connectionId}
                      onClick={() => {
                        setSelectedAthleteId(conn.athlete!.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                        conn.athlete?.id === selectedAthleteId
                          ? 'bg-[#2563EB]/10 text-[#2563EB]'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C]">
                        <span className="text-[10px] font-bold text-white">
                          {(conn.athlete?.name || '?')[0]}
                        </span>
                      </div>
                      {conn.athlete?.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 pt-6">
        {/* Athlete Info Card */}
        <div className="rounded-2xl bg-zinc-900 p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C]">
              <span className="text-lg font-bold text-white">
                {(selectedAthlete?.athlete?.name || '?')[0]}
              </span>
            </div>
            <div>
              <p className="text-lg font-heading font-bold">
                {selectedAthlete?.athlete?.name}
              </p>
              {selectedAthlete?.athlete?.club && (
                <p className="text-sm text-zinc-400">{selectedAthlete.athlete.club}</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-zinc-800 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <div className="text-lg font-heading">{wins}-{losses}</div>
              <div className="text-[10px] text-zinc-500">RECORD</div>
            </div>
            <div className="rounded-xl bg-zinc-800 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <div className="text-lg font-heading">{avgScore}</div>
              <div className="text-[10px] text-zinc-500">AVG SCORE</div>
            </div>
            <div className="rounded-xl bg-zinc-800 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div className="text-lg font-heading">{matches.length}</div>
              <div className="text-[10px] text-zinc-500">MATCHES</div>
            </div>
          </div>
        </div>

        {/* Recent Matches */}
        <h2 className="mb-3 text-sm font-medium text-zinc-400">RECENT MATCHES</h2>

        {loadingMatches ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl bg-zinc-900 p-6 text-center">
            <p className="text-sm text-zinc-400">No matches recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match) => {
              const isWin = match.matchResult === 'win' || match.matchResult === 'W';
              const isLoss = match.matchResult === 'loss' || match.matchResult === 'L';

              return (
                <div
                  key={match.id}
                  className="rounded-2xl bg-zinc-900 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                        isWin ? 'bg-green-500/10 text-green-400' :
                        isLoss ? 'bg-red-500/10 text-red-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {isWin ? 'W' : isLoss ? 'L' : '—'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {match.opponentName || 'Unknown Opponent'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>{new Date(match.createdAt).toLocaleDateString()}</span>
                          {match.competitionName && (
                            <>
                              <span>&bull;</span>
                              <span>{match.competitionName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-heading">{match.overallScore}</div>
                      <div className="text-[10px] text-zinc-500">SCORE</div>
                    </div>
                  </div>

                  {/* Position breakdown */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-zinc-800 px-2 py-1.5 text-center">
                      <div className="text-xs font-medium">{match.standing}</div>
                      <div className="text-[9px] text-zinc-500">STAND</div>
                    </div>
                    <div className="rounded-lg bg-zinc-800 px-2 py-1.5 text-center">
                      <div className="text-xs font-medium">{match.top}</div>
                      <div className="text-[9px] text-zinc-500">TOP</div>
                    </div>
                    <div className="rounded-lg bg-zinc-800 px-2 py-1.5 text-center">
                      <div className="text-xs font-medium">{match.bottom}</div>
                      <div className="text-[9px] text-zinc-500">BOTTOM</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending connections (if any) */}
        {pendingConnections.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              PENDING CONNECTIONS
            </h2>
            <div className="space-y-2">
              {pendingConnections.map((conn) => (
                <div
                  key={conn.connectionId}
                  className="flex items-center justify-between rounded-2xl bg-zinc-900 p-4"
                >
                  <div>
                    <p className="text-sm font-medium">{conn.clubName || 'Club Connection'}</p>
                    <p className="text-xs text-zinc-500">
                      Requested {new Date(conn.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1">
                    <Clock className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400">Pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
