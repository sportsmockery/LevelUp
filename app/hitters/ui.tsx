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
// UDC Logo — premium SVG wordmark with home-plate / cougar motif
// ----------------------------------------------------------------------------
export function UDCLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        viewBox="0 0 64 64"
        className="size-10 shrink-0"
        role="img"
        aria-label="Upper Deck Cougars logo"
      >
        <defs>
          <linearGradient id="udc-plate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#C7D2E0" />
          </linearGradient>
        </defs>
        {/* home plate */}
        <path
          d="M32 4 L56 18 V44 L32 60 L8 44 V18 Z"
          fill="url(#udc-plate)"
          stroke="#C8102E"
          strokeWidth="2.5"
        />
        {/* stylized UDC monogram */}
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontFamily="'Space Grotesk', sans-serif"
          fontWeight="700"
          fontSize="20"
          fill="#0B1D36"
          letterSpacing="-1"
        >
          UDC
        </text>
        {/* seam accent */}
        <path d="M16 28 Q32 22 48 28" fill="none" stroke="#C8102E" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div className="leading-none">
        <div className="font-heading text-[15px] font-bold tracking-tight text-white">
          UPPER DECK COUGARS
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C8102E]">
          Hitters UDC · Est. 1992
        </div>
      </div>
    </div>
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
