'use client';

export default function StreakCounter({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-2 mt-4">
      <span className="text-2xl">🔥</span>
      <span className="font-heading text-lg font-bold">{streak}-day streak</span>
      <span className="text-zinc-400 text-sm ml-1">Keep it going!</span>
    </div>
  );
}
