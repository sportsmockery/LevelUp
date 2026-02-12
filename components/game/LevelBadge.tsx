'use client';

export default function LevelBadge({ level, xp }: { level: number; xp: number }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
        <div className="w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center">
          <span className="text-lg font-heading font-bold">{level}</span>
        </div>
      </div>
    </div>
  );
}
