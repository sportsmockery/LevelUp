'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import XPBar from '@/components/game/XPBar';
import LevelBadge from '@/components/game/LevelBadge';
import StreakCounter from '@/components/game/StreakCounter';
import Confetti from '@/components/game/Confetti';
import BottomNav from '@/components/BottomNav';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [xp, setXp] = useState(1240);
  const [level, setLevel] = useState(12);
  const [streak, setStreak] = useState(7);

  useEffect(() => {
    supabase?.auth?.getUser().then(({ data }: any) => setUser(data.user));
  }, []);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-800">
        <div>
          <h1 className="text-3xl font-heading tracking-tighter">LEVELUP</h1>
          <p className="text-zinc-400 text-sm">Youth Wrestling OS</p>
        </div>
        <LevelBadge level={level} xp={xp} />
      </div>

      {/* XP Bar */}
      <div className="p-6">
        <XPBar current={xp} max={2000} level={level} />
        <StreakCounter streak={streak} />
      </div>

      {/* Today's Mission */}
      <div className="mx-6 bg-zinc-900 rounded-3xl p-6 border border-[#E91E8C]/30">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[#E91E8C] font-medium text-sm">TODAY&apos;S MISSION</p>
            <p className="text-xl font-heading mt-1">Upload your last match</p>
            <p className="text-zinc-400 text-sm mt-1">+150 XP &bull; AI Analysis</p>
          </div>
          <div className="bg-[#2563EB] text-white text-xs px-4 py-2 rounded-2xl font-medium cursor-pointer"
               onClick={() => window.location.href = '/upload'}>
            UPLOAD NOW
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mx-6 mt-8">
        <div className="bg-zinc-900 rounded-3xl p-6 text-center">
          <div className="text-4xl font-heading">72%</div>
          <div className="text-zinc-400 text-xs mt-1">WIN RATE</div>
        </div>
        <div className="bg-zinc-900 rounded-3xl p-6 text-center">
          <div className="text-4xl font-heading">84</div>
          <div className="text-zinc-400 text-xs mt-1">AVG TECH SCORE</div>
        </div>
        <div className="bg-zinc-900 rounded-3xl p-6 text-center">
          <div className="text-4xl font-heading">11</div>
          <div className="text-zinc-400 text-xs mt-1">DAYS TO STATE</div>
        </div>
      </div>

      <Confetti />
      <BottomNav />
    </div>
  );
}
