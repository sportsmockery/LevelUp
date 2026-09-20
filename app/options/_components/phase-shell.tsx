import { cn } from '@/lib/utils';

/**
 * Shared chrome for the ThetaDesk surfaces.
 *
 * Every screen here is a Phase 0 scaffold: the route, the shape and the
 * intent are real, the data layer is not. These screens deliberately show an
 * honest pending state rather than sample equity curves — a desk whose entire
 * pitch is a tamper-evident track record does not ship placeholder P&L.
 */

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
    <header className="border-b border-slate-800 px-8 py-7">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal-400">
        {eyebrow}
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h1>
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
        'rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6',
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
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatTile({
  label,
  value,
  unit,
  tone = 'default',
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'default' | 'accent' | 'muted';
}) {
  return (
    <div className="border-l border-slate-800 px-5 py-4 first:border-l-0 first:pl-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          'mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight',
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
