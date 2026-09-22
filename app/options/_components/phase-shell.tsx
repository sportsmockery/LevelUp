import { cn } from '@/lib/utils';

/**
 * Shared chrome for the ThetaDesk surfaces.
 *
 * Every screen here is a Phase 0 scaffold: the route, the shape and the
 * intent are real, the data layer is not. These screens deliberately show an
 * honest pending state rather than sample equity curves — a desk whose entire
 * pitch is a tamper-evident track record does not ship placeholder P&L.
 */

/** Page gutter. Narrow on phones, generous once there is room. */
export const GUTTER = 'px-4 sm:px-6 lg:px-8';

export function PageHeader({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <header className={cn('border-b border-slate-800 py-6 sm:py-7', GUTTER)}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal-400">
        {eyebrow}
      </div>
      <h1 className="mt-2 text-balance text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{blurb}</p>
    </header>
  );
}

export function PendingPanel({
  phase,
  heading,
  items,
  className,
}: {
  phase: string;
  heading: string;
  items: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 sm:p-6',
        className
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
          {phase}
        </span>
        <span className="text-sm font-medium text-slate-200">{heading}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-400">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Tile container. The 1px gap over a slate ground draws clean hairlines
 * between tiles at every column count, so the row reflows from 2-up on a
 * phone to 5-up on a desktop without stray or doubled borders.
 */
export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-800 sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  unit,
  tone = 'default',
  wide = false,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'default' | 'accent' | 'muted';
  /** Set on the last tile of an odd-length row so it fills the gap instead of
   *  leaving a dead cell at 2-up and 3-up. */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-[#070c10] px-4 py-3.5',
        wide && 'col-span-2 lg:col-span-1'
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          'mt-2 font-mono text-xl font-bold tabular-nums tracking-tight sm:text-2xl',
          tone === 'accent' && 'text-teal-400',
          tone === 'muted' && 'text-slate-600',
          tone === 'default' && 'text-slate-100'
        )}
      >
        {value}
      </div>
      {unit && (
        <div className="mt-0.5 font-mono text-[10px] tracking-wide text-slate-600">{unit}</div>
      )}
    </div>
  );
}

/** Disclaimer shown on every surface while the desk is not live. */
export function ScaffoldNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'max-w-3xl font-mono text-[11px] leading-relaxed text-slate-600',
        className
      )}
    >
      Phase 0 scaffold. No market data is connected, no orders can be placed, and no track
      record is represented. Nothing on this surface is an offer, a solicitation, or investment
      advice.
    </p>
  );
}
