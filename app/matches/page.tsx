'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import {
  Search, Plus, ChevronRight, Video, User, TrendingUp, TrendingDown,
  Shield, Target, Eye, Filter,
} from 'lucide-react';

type MatchEntry = {
  id: number;
  opponent: string;
  result: 'W' | 'L';
  score: number;
  method: string;
  date: string;
  tournament: string;
  hasVideo: boolean;
  weightClass: string;
};

const matchLog: MatchEntry[] = [
  { id: 1, opponent: 'Jake Martinez', result: 'W', score: 88, method: 'Tech Fall 15-0', date: 'Feb 8', tournament: 'Metro Duals', hasVideo: true, weightClass: '132' },
  { id: 2, opponent: 'Ryan Kim', result: 'W', score: 76, method: 'Decision 8-4', date: 'Feb 5', tournament: 'Metro Duals', hasVideo: true, weightClass: '132' },
  { id: 3, opponent: 'Tyler Sullivan', result: 'L', score: 62, method: 'Decision 3-6', date: 'Feb 1', tournament: 'Valley Classic', hasVideo: true, weightClass: '132' },
  { id: 4, opponent: 'Alex Park', result: 'W', score: 91, method: 'Pin 2:34', date: 'Jan 28', tournament: 'Valley Classic', hasVideo: false, weightClass: '132' },
  { id: 5, opponent: 'Sam Rodriguez', result: 'W', score: 84, method: 'Decision 11-5', date: 'Jan 25', tournament: 'City Open', hasVideo: true, weightClass: '132' },
  { id: 6, opponent: 'Marcus Lee', result: 'W', score: 79, method: 'Major Decision 12-3', date: 'Jan 20', tournament: 'City Open', hasVideo: false, weightClass: '132' },
  { id: 7, opponent: 'Dylan Torres', result: 'L', score: 55, method: 'Pin 4:12', date: 'Jan 18', tournament: 'Wildcat Invite', hasVideo: true, weightClass: '132' },
  { id: 8, opponent: 'Ethan Wright', result: 'W', score: 87, method: 'Decision 7-2', date: 'Jan 14', tournament: 'Wildcat Invite', hasVideo: true, weightClass: '132' },
];

type ScoutProfile = {
  name: string;
  record: string;
  weightClass: string;
  avgScore: number;
  style: string;
  strengths: string[];
  weaknesses: string[];
  recentResults: { opponent: string; result: string }[];
};

const scoutableWrestlers: ScoutProfile[] = [
  {
    name: 'Jake Martinez',
    record: '22-3',
    weightClass: '132',
    avgScore: 82,
    style: 'Aggressive – shoots early and often',
    strengths: ['Double leg blast', 'Heavy riding time', 'Good conditioning'],
    weaknesses: ['Susceptible to front headlock', 'Slow recovery from bottom'],
    recentResults: [
      { opponent: 'You', result: 'L – Tech Fall' },
      { opponent: 'Ryan Kim', result: 'W – Decision 6-3' },
      { opponent: 'Tyler Sullivan', result: 'W – Pin 3:45' },
    ],
  },
  {
    name: 'Tyler Sullivan',
    record: '18-6',
    weightClass: '132',
    avgScore: 74,
    style: 'Counter wrestler – waits for mistakes',
    strengths: ['Excellent sprawl', 'Cradle from top', 'Patient neutral'],
    weaknesses: ['Low shot output', 'Weak in scrambles', 'Gives up back points'],
    recentResults: [
      { opponent: 'You', result: 'W – Decision 6-3' },
      { opponent: 'Marcus Lee', result: 'L – Major Decision' },
      { opponent: 'Sam Rodriguez', result: 'W – Decision 4-2' },
    ],
  },
  {
    name: 'Dylan Torres',
    record: '20-5',
    weightClass: '132',
    avgScore: 79,
    style: 'Upper body – snaps and shucks',
    strengths: ['Underhook offense', 'Quick pins from top', 'Strong clinch'],
    weaknesses: ['Low single defense', 'Gassed in 3rd period', 'Can be leg attacked'],
    recentResults: [
      { opponent: 'You', result: 'W – Pin 4:12' },
      { opponent: 'Jake Martinez', result: 'L – Decision 2-5' },
      { opponent: 'Ethan Wright', result: 'W – Decision 8-6' },
    ],
  },
];

export default function MatchesPage() {
  const [tab, setTab] = useState<'log' | 'scout'>('log');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScout, setSelectedScout] = useState<ScoutProfile | null>(null);

  const filteredMatches = matchLog.filter(m =>
    m.opponent.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tournament.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScouts = scoutableWrestlers.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading tracking-tight">Matches</h1>
            <p className="text-zinc-400 text-sm mt-1">Log results &amp; scout opponents</p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tab === 'log' ? 'Search matches...' : 'Search wrestlers...'}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#2563EB] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-3">
        {(['log', 'scout'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearchQuery(''); setSelectedScout(null); }}
            className={`px-5 py-2 rounded-2xl text-sm font-medium transition-colors ${
              tab === t ? 'bg-[#2563EB] text-white' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {t === 'log' ? 'Match Log' : 'Scout'}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Match Log Tab */}
        {tab === 'log' && (
          <div className="space-y-6">
            {/* Season Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                <div className="text-2xl font-heading text-green-400">
                  {matchLog.filter(m => m.result === 'W').length}
                </div>
                <div className="text-zinc-500 text-[10px]">WINS</div>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                <div className="text-2xl font-heading text-red-400">
                  {matchLog.filter(m => m.result === 'L').length}
                </div>
                <div className="text-zinc-500 text-[10px]">LOSSES</div>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                <div className="text-2xl font-heading">
                  {Math.round(matchLog.reduce((sum, m) => sum + m.score, 0) / matchLog.length)}
                </div>
                <div className="text-zinc-500 text-[10px]">AVG SCORE</div>
              </div>
            </div>

            {/* Match Cards */}
            <div className="space-y-3">
              {filteredMatches.map(match => (
                <div key={match.id} className="bg-zinc-900 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-heading font-bold text-sm ${
                        match.result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {match.result}
                      </div>
                      <div>
                        <p className="font-medium text-sm">vs {match.opponent}</p>
                        <p className="text-zinc-500 text-xs">{match.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-heading">{match.score}</div>
                      <div className="text-zinc-600 text-[10px]">TECH</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{match.tournament}</span>
                      <span>&bull;</span>
                      <span>{match.date}</span>
                      <span>&bull;</span>
                      <span>{match.weightClass} lbs</span>
                    </div>
                    {match.hasVideo && (
                      <div className="flex items-center gap-1 text-[#2563EB] text-xs">
                        <Video className="w-3 h-3" />
                        <span>Film</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scout Tab */}
        {tab === 'scout' && !selectedScout && (
          <div className="space-y-3">
            <p className="text-zinc-400 text-xs mb-2">WRESTLERS IN YOUR WEIGHT CLASS</p>
            {filteredScouts.map((wrestler, i) => (
              <button
                key={i}
                onClick={() => setSelectedScout(wrestler)}
                className="w-full bg-zinc-900 rounded-2xl p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{wrestler.name}</p>
                    <p className="text-zinc-500 text-xs">{wrestler.record} &bull; {wrestler.weightClass} lbs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-lg font-heading">{wrestler.avgScore}</div>
                    <div className="text-zinc-600 text-[10px]">AVG</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Scout Report Detail */}
        {tab === 'scout' && selectedScout && (
          <div className="space-y-5">
            <button
              onClick={() => setSelectedScout(null)}
              className="text-zinc-400 text-sm"
            >
              ← All Wrestlers
            </button>

            {/* Header */}
            <div className="bg-zinc-900 rounded-3xl p-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <User className="w-8 h-8 text-zinc-500" />
              </div>
              <div>
                <h2 className="text-xl font-heading">{selectedScout.name}</h2>
                <p className="text-zinc-400 text-sm">{selectedScout.record} &bull; {selectedScout.weightClass} lbs</p>
                <p className="text-zinc-500 text-xs mt-0.5">{selectedScout.style}</p>
              </div>
            </div>

            {/* AI Score */}
            <div className="bg-zinc-900 rounded-3xl p-5 text-center border border-[#E91E8C]/30">
              <p className="text-zinc-400 text-xs mb-1">AI SCOUTING SCORE</p>
              <div className="text-5xl font-heading font-bold">{selectedScout.avgScore}</div>
            </div>

            {/* Strengths */}
            <div className="bg-zinc-900 rounded-3xl p-5">
              <p className="text-[#2563EB] font-medium text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> THEIR STRENGTHS
              </p>
              {selectedScout.strengths.map((s, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                  <span className="text-sm text-zinc-300">{s}</span>
                </div>
              ))}
            </div>

            {/* Weaknesses */}
            <div className="bg-zinc-900 rounded-3xl p-5">
              <p className="text-[#E91E8C] font-medium text-sm mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" /> ATTACK THESE
              </p>
              {selectedScout.weaknesses.map((w, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E91E8C]" />
                  <span className="text-sm text-zinc-300">{w}</span>
                </div>
              ))}
            </div>

            {/* Recent Results */}
            <div className="bg-zinc-900 rounded-3xl p-5">
              <p className="text-white font-medium text-sm mb-3">RECENT RESULTS</p>
              {selectedScout.recentResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-sm text-zinc-300">vs {r.opponent}</span>
                  <span className={`text-xs font-medium ${r.result.startsWith('W') ? 'text-green-400' : 'text-red-400'}`}>
                    {r.result}
                  </span>
                </div>
              ))}
            </div>

            {/* Game Plan Button */}
            <button className="w-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] text-white font-heading font-bold py-4 rounded-2xl text-lg">
              <Eye className="inline w-5 h-5 mr-2 -mt-0.5" />
              GENERATE GAME PLAN
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
