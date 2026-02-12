'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { TrendingUp, TrendingDown, Target, Flame, Award, ChevronRight } from 'lucide-react';

const weeklyData = [
  { day: 'Mon', score: 72 },
  { day: 'Tue', score: 78 },
  { day: 'Wed', score: 65 },
  { day: 'Thu', score: 82 },
  { day: 'Fri', score: 88 },
  { day: 'Sat', score: 91 },
  { day: 'Sun', score: 85 },
];

const matchHistory = [
  { opponent: 'Jake M.', result: 'W', score: 88, method: 'Tech Fall', date: 'Feb 8' },
  { opponent: 'Ryan K.', result: 'W', score: 76, method: 'Decision 8-4', date: 'Feb 5' },
  { opponent: 'Tyler S.', result: 'L', score: 62, method: 'Decision 3-6', date: 'Feb 1' },
  { opponent: 'Alex P.', result: 'W', score: 91, method: 'Pin 2:34', date: 'Jan 28' },
  { opponent: 'Sam R.', result: 'W', score: 84, method: 'Decision 11-5', date: 'Jan 25' },
];

const positionBreakdown = [
  { position: 'Standing', score: 82, trend: 'up', change: '+5' },
  { position: 'Top', score: 78, trend: 'up', change: '+3' },
  { position: 'Bottom', score: 71, trend: 'down', change: '-2' },
  { position: 'Scrambles', score: 68, trend: 'up', change: '+8' },
];

export default function StatsPage() {
  const [tab, setTab] = useState<'overview' | 'matches'>('overview');
  const maxScore = Math.max(...weeklyData.map(d => d.score));

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-2xl font-heading tracking-tight">Performance</h1>
        <p className="text-zinc-400 text-sm mt-1">Track your wrestling evolution</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-4">
        {(['overview', 'matches'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-2xl text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-[#2563EB] text-white'
                : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {t === 'overview' ? 'Overview' : 'Match History'}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="p-6 space-y-6">
          {/* Season Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-[#2563EB]" />
                <span className="text-zinc-400 text-xs">RECORD</span>
              </div>
              <div className="text-3xl font-heading">18-4</div>
              <div className="text-green-400 text-xs mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 82% win rate
              </div>
            </div>
            <div className="bg-zinc-900 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-[#E91E8C]" />
                <span className="text-zinc-400 text-xs">AVG SCORE</span>
              </div>
              <div className="text-3xl font-heading">84</div>
              <div className="text-green-400 text-xs mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +6 this month
              </div>
            </div>
            <div className="bg-zinc-900 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-yellow-400" />
                <span className="text-zinc-400 text-xs">TAKEDOWNS/MATCH</span>
              </div>
              <div className="text-3xl font-heading">3.2</div>
              <div className="text-green-400 text-xs mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +0.8 vs last month
              </div>
            </div>
            <div className="bg-zinc-900 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-zinc-400 text-xs">PIN RATE</span>
              </div>
              <div className="text-3xl font-heading">28%</div>
              <div className="text-zinc-400 text-xs mt-1">5 pins this season</div>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-sm font-medium mb-4">WEEKLY TECH SCORES</p>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-zinc-400">{d.score}</span>
                  <div
                    className="w-full rounded-xl bg-gradient-to-t from-[#2563EB] to-[#E91E8C] transition-all"
                    style={{ height: `${(d.score / maxScore) * 100}%` }}
                  />
                  <span className="text-[10px] text-zinc-500">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Position Breakdown */}
          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-sm font-medium mb-4">POSITION BREAKDOWN</p>
            {positionBreakdown.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                <span className="text-sm">{p.position}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] rounded-full"
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-heading w-8">{p.score}</span>
                  <span className={`text-xs flex items-center gap-0.5 ${p.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {p.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {p.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Match History Tab */
        <div className="p-6 space-y-3">
          {matchHistory.map((m, i) => (
            <div key={i} className="bg-zinc-900 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm ${
                  m.result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {m.result}
                </div>
                <div>
                  <p className="font-medium text-sm">vs {m.opponent}</p>
                  <p className="text-zinc-400 text-xs">{m.method} &bull; {m.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-lg font-heading">{m.score}</div>
                  <div className="text-zinc-500 text-[10px]">TECH SCORE</div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
