'use client';

export default function XPBar({ current, max, level }: { current: number; max: number; level: number }) {
  const percent = Math.min((current / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span>LEVEL {level}</span>
        <span>{current} / {max} XP</span>
      </div>
      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] transition-all"
             style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
