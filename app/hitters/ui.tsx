'use client';

import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as React from 'react';

// ----------------------------------------------------------------------------
// Motion helpers
// ----------------------------------------------------------------------------
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// ----------------------------------------------------------------------------
// Glass card
// ----------------------------------------------------------------------------
export function Glass({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl',
        'shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]',
        className
      )}
    >
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Section heading
// ----------------------------------------------------------------------------
export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#F8FAFC]">
      <span className="size-1.5 rounded-full bg-[#C8102E]" />
      {children}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Hitters Baseball logo
// Uses the real raster at /hitters-logo.png when present; falls back to a
// black & white SVG recreation (gradients preserved) if the file is missing.
// To use the official artwork, add it at: public/hitters-logo.png
// ----------------------------------------------------------------------------
export function HittersLogo({ className }: { className?: string }) {
  const [useRaster, setUseRaster] = React.useState(true);
  if (useRaster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/hitters-logo.png"
        alt="Hitters Baseball — Feel the Power"
        className={cn('w-auto object-contain', className)}
        onError={() => setUseRaster(false)}
      />
    );
  }
  return <HittersMark className={className} />;
}

function HittersMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 200"
      className={cn('w-auto', className)}
      role="img"
      aria-label="Hitters Baseball — Feel the Power"
    >
      <defs>
        {/* baseball sphere — white to gray radial */}
        <radialGradient id="h-ball" cx="40%" cy="34%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e4e4e4" />
          <stop offset="100%" stopColor="#9b9b9b" />
        </radialGradient>
        {/* dark disc / band — grayscale linear */}
        <linearGradient id="h-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#525252" />
          <stop offset="48%" stopColor="#2b2b2b" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </linearGradient>
        {/* script fill — grayscale linear for depth */}
        <linearGradient id="h-script" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c5c5c" />
          <stop offset="45%" stopColor="#262626" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <filter id="h-shadow" x="-20%" y="-25%" width="140%" height="150%">
          <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.45" />
        </filter>
        {/* text baselines */}
        <path id="h-top" d="M 56 28 A 150 9 0 0 1 244 28" fill="none" />
        <path id="h-bot" d="M 60 168 A 104 22 0 0 0 240 168" fill="none" />
      </defs>

      {/* dark disc */}
      <ellipse cx="150" cy="100" rx="146" ry="98" fill="url(#h-band)" stroke="#000000" strokeWidth="2" />
      <ellipse cx="150" cy="100" rx="146" ry="98" fill="none" stroke="#6e6e6e" strokeWidth="1" opacity="0.5" />

      {/* baseball */}
      <circle cx="150" cy="100" r="74" fill="url(#h-ball)" stroke="#7c7c7c" strokeWidth="1.5" />

      {/* seams + stitches (grayscale) */}
      <g fill="none" stroke="#4a4a4a" strokeLinecap="round">
        <path d="M 100 38 Q 150 100 116 162" strokeWidth="2" />
        <path d="M 200 38 Q 150 100 184 162" strokeWidth="2" />
        <path d="M 100 38 Q 150 100 116 162" strokeWidth="8" strokeDasharray="1 10" opacity="0.65" />
        <path d="M 200 38 Q 150 100 184 162" strokeWidth="8" strokeDasharray="1 10" opacity="0.65" />
      </g>

      {/* curved banners */}
      <text fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="15" letterSpacing="2.5" fill="#f5f5f5">
        <textPath href="#h-top" xlinkHref="#h-top" startOffset="50%" textAnchor="middle">FEEL THE POWER!</textPath>
      </text>
      <text fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="19" letterSpacing="7" fill="#f5f5f5">
        <textPath href="#h-bot" xlinkHref="#h-bot" startOffset="50%" textAnchor="middle">BASEBALL</textPath>
      </text>

      {/* Hitters wordmark — outlined script look */}
      <g filter="url(#h-shadow)">
        <text x="150" y="124" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontWeight="700" fontSize="74" strokeLinejoin="round" stroke="#ffffff" strokeWidth="6" fill="none">Hitters</text>
        <text x="150" y="124" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontWeight="700" fontSize="74" fill="url(#h-script)">Hitters</text>
      </g>
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Buttons (brand-styled)
// ----------------------------------------------------------------------------
export function RedButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-6 py-3 text-sm font-bold text-white',
        'shadow-[0_8px_30px_-8px_rgba(200,16,46,0.7)] transition-all duration-300',
        'hover:bg-[#E11D3A] hover:shadow-[0_10px_40px_-6px_rgba(200,16,46,0.85)] hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1D36]',
        'disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white',
        'backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Animated counter
// ----------------------------------------------------------------------------
export function StatNumber({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const duration = 1400;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(value * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
