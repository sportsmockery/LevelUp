'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import {
  User, Settings, ChevronRight, Trophy, Flame, Target, TrendingUp,
  Video, Award, Star, Shield, Zap, Medal, LogOut,
} from 'lucide-react';

const badges = [
  { name: 'First Upload', icon: Video, earned: true, description: 'Upload your first match video' },
  { name: '7-Day Streak', icon: Flame, earned: true, description: 'Train 7 days in a row' },
  { name: 'Tech Score 90+', icon: Star, earned: true, description: 'Score 90+ on a match analysis' },
  { name: 'Pin Master', icon: Target, earned: false, description: 'Win 5 matches by pin' },
  { name: '30-Day Streak', icon: Shield, earned: false, description: 'Train 30 days in a row' },
  { name: 'State Qualifier', icon: Medal, earned: false, description: 'Qualify for state tournament' },
  { name: 'Level 25', icon: Zap, earned: false, description: 'Reach Level 25' },
  { name: 'Team Captain', icon: Award, earned: false, description: 'Be named a team captain' },
];

const levelHistory = [
  { level: 12, date: 'Feb 10', xpEarned: 180 },
  { level: 11, date: 'Feb 6', xpEarned: 200 },
  { level: 10, date: 'Feb 1', xpEarned: 150 },
  { level: 9, date: 'Jan 27', xpEarned: 220 },
  { level: 8, date: 'Jan 22', xpEarned: 175 },
];

const settingsItems = [
  { label: 'Edit Profile', icon: User },
  { label: 'Notifications', icon: Settings },
  { label: 'Weight Class', icon: Target },
  { label: 'Club Settings', icon: Shield },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<'stats' | 'badges' | 'settings'>('stats');

  return (
    <div className="min-h-screen pb-20">
      {/* Profile Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
              <div className="w-[72px] h-[72px] rounded-full bg-[#0A0A0A] flex items-center justify-center">
                <User className="w-8 h-8 text-zinc-400" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-xs font-heading font-bold border-2 border-[#0A0A0A]">
              12
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-heading">Wrestler</h1>
            <p className="text-zinc-400 text-sm">132 lbs • Age 14</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-[#2563EB] flex items-center gap-1">
                <Flame className="w-3 h-3" /> 7-day streak
              </span>
              <span className="text-xs text-zinc-500">Joined Jan 2026</span>
            </div>
          </div>
        </div>

        {/* XP Summary */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span>LEVEL 12</span>
            <span>1,240 / 2,000 XP</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C]" style={{ width: '62%' }} />
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center">
            <div className="text-xl font-heading">18-4</div>
            <div className="text-zinc-500 text-[10px]">RECORD</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-heading">84</div>
            <div className="text-zinc-500 text-[10px]">AVG SCORE</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-heading">22</div>
            <div className="text-zinc-500 text-[10px]">VIDEOS</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-heading">3/8</div>
            <div className="text-zinc-500 text-[10px]">BADGES</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-4">
        {(['stats', 'badges', 'settings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-2xl text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-[#2563EB] text-white' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Stats Tab */}
        {tab === 'stats' && (
          <div className="space-y-6">
            {/* Season Performance */}
            <div className="bg-zinc-900 rounded-3xl p-5">
              <p className="text-sm font-medium mb-4">SEASON PERFORMANCE</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-zinc-400 text-xs mb-1">WIN RATE</div>
                  <div className="text-2xl font-heading flex items-center gap-2">
                    82%
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400 text-xs mb-1">PIN RATE</div>
                  <div className="text-2xl font-heading">28%</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-xs mb-1">TAKEDOWNS/MATCH</div>
                  <div className="text-2xl font-heading">3.2</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-xs mb-1">TOTAL XP</div>
                  <div className="text-2xl font-heading text-[#E91E8C]">12,480</div>
                </div>
              </div>
            </div>

            {/* Level History */}
            <div className="bg-zinc-900 rounded-3xl p-5">
              <p className="text-sm font-medium mb-4">LEVEL HISTORY</p>
              <div className="space-y-3">
                {levelHistory.map((l, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C] flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-[#0A0A0A] flex items-center justify-center text-xs font-heading font-bold">
                          {l.level}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reached Level {l.level}</p>
                        <p className="text-zinc-500 text-xs">{l.date}</p>
                      </div>
                    </div>
                    <span className="text-xs text-green-400">+{l.xpEarned} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Badges Tab */}
        {tab === 'badges' && (
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <div
                  key={i}
                  className={`bg-zinc-900 rounded-2xl p-4 text-center border transition-colors ${
                    badge.earned ? 'border-[#2563EB]/30' : 'border-zinc-800 opacity-40'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${
                    badge.earned ? 'bg-[#2563EB]/20' : 'bg-zinc-800'
                  }`}>
                    <Icon className={`w-6 h-6 ${badge.earned ? 'text-[#2563EB]' : 'text-zinc-600'}`} />
                  </div>
                  <p className="text-sm font-medium mt-2">{badge.name}</p>
                  <p className="text-zinc-500 text-[10px] mt-0.5">{badge.description}</p>
                  {badge.earned && (
                    <span className="inline-block mt-2 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      Earned
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="space-y-3">
            {settingsItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  className="w-full bg-zinc-900 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
              );
            })}
            <div className="pt-4">
              <button className="w-full bg-zinc-900 rounded-2xl p-4 flex items-center justify-between text-red-400">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">Sign Out</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
