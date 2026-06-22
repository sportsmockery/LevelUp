'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calculator, Sparkles, ArrowRight, Gauge, CalendarDays, Inbox } from 'lucide-react';
import { useSunVista } from '../store';
import { AiProcessing } from '@/components/sunvista/AiProcessing';
import { Estimate, EstimateLineItem, TRADE_LABELS } from '@/lib/sunvista/schemas';
import { formatCurrency } from '@/lib/sunvista/format';

const STEPS = [
  'Analyzing scope & quantities',
  'Pulling Albuquerque labor & material rates',
  'Building line-item takeoff',
  'Applying overhead, contingency & margin',
];

const CATEGORY_ORDER: EstimateLineItem['category'][] = [
  'labor',
  'materials',
  'equipment',
  'subcontractor',
  'permits',
];
const CATEGORY_LABELS: Record<EstimateLineItem['category'], string> = {
  labor: 'Labor',
  materials: 'Materials',
  equipment: 'Equipment',
  subcontractor: 'Subcontractor',
  permits: 'Permits & Fees',
};

export default function EstimatePage() {
  const router = useRouter();
  const { activeJob, updateJob } = useSunVista();
  const [phase, setPhase] = useState<'idle' | 'processing'>('idle');
  const [step, setStep] = useState(0);

  if (!activeJob) return <EmptyState />;

  const estimate = activeJob.estimate;

  async function generate() {
    if (!activeJob) return;
    setPhase('processing');
    setStep(0);
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 750);
    try {
      const res = await fetch('/api/sunvista/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake: activeJob.intake }),
      });
      const data = await res.json();
      clearInterval(ticker);
      const est: Estimate = data.estimate;
      updateJob(activeJob.id, { estimate: est, bidTotal: est.bidTotal, stage: 'estimated' });
      setPhase('idle');
    } catch {
      clearInterval(ticker);
      setPhase('idle');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Header job={activeJob} />

      {!estimate && phase === 'idle' && (
        <div className="rounded-xl border border-slate-800 bg-[#0c0f14] p-8 text-center">
          <Calculator className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-semibold text-white">Generate AI Estimate</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            BuildAI will build a defensible, line-item estimate for{' '}
            <span className="text-slate-200">{activeJob.title}</span> using current Albuquerque market rates.
          </p>
          <button
            onClick={generate}
            className="mx-auto mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> Generate Estimate
          </button>
        </div>
      )}

      {phase === 'processing' && <AiProcessing steps={STEPS} currentStep={step} title="BuildAI is estimating…" />}

      {estimate && phase === 'idle' && <EstimateView estimate={estimate} onContinue={() => router.push('/sunvista/pricing')} onRegen={generate} />}
    </div>
  );
}

function Header({ job }: { job: NonNullable<ReturnType<typeof useSunVista>['activeJob']> }) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-400">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
          2
        </span>
        AI Estimating
      </div>
      <h1 className="mt-2 text-2xl font-bold text-white">{job.title}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {job.jobNumber} · {job.property} ·{' '}
        {job.trades.map((t) => TRADE_LABELS[t] || t).join(', ')}
      </p>
    </header>
  );
}

function EstimateView({
  estimate,
  onContinue,
  onRegen,
}: {
  estimate: Estimate;
  onContinue: () => void;
  onRegen: () => void;
}) {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: estimate.lineItems.filter((li) => li.category === cat),
  })).filter((g) => g.items.length);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Bid Total" value={formatCurrency(estimate.bidTotal)} highlight />
        <SummaryCard label="Direct Cost" value={formatCurrency(estimate.subtotal)} />
        <SummaryCard label="Duration" value={`${estimate.durationDays} days`} icon={<CalendarDays className="h-3.5 w-3.5" />} />
        <SummaryCard
          label="AI Confidence"
          value={`${Math.round(estimate.confidence * 100)}%`}
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0c0f14]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 text-right font-medium">Qty</th>
              <th className="px-4 py-2.5 font-medium">Unit</th>
              <th className="px-4 py-2.5 text-right font-medium">Unit Cost</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <Fragment key={g.cat}>
                <tr className="bg-slate-900/40">
                  <td colSpan={5} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                    {CATEGORY_LABELS[g.cat]}
                  </td>
                </tr>
                {g.items.map((li, i) => (
                  <tr key={`${g.cat}-${i}`} className="border-b border-slate-800/50">
                    <td className="px-4 py-2.5 text-slate-200">
                      {li.description}
                      <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                        {TRADE_LABELS[li.trade] || li.trade}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{li.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-slate-400">{li.unit}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{formatCurrency(li.unitCost, { cents: true })}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-100">{formatCurrency(li.total)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-1 border-t border-slate-800 px-4 py-3 text-sm">
          <TotalRow label="Direct Cost Subtotal" value={formatCurrency(estimate.subtotal)} />
          <TotalRow label={`Overhead (${estimate.overheadPct}%)`} value={formatCurrency(estimate.subtotal * estimate.overheadPct / 100)} muted />
          <TotalRow label={`Contingency (${estimate.contingencyPct}%)`} value={formatCurrency(estimate.subtotal * estimate.contingencyPct / 100)} muted />
          <TotalRow label={`Margin (${estimate.marginPct}%)`} value={formatCurrency(estimate.subtotal * estimate.marginPct / 100)} muted />
          <div className="mt-2 flex items-center justify-between border-t border-slate-700 pt-2 text-base font-bold">
            <span className="text-white">Bid Total</span>
            <span className="text-amber-400">{formatCurrency(estimate.bidTotal)}</span>
          </div>
        </div>
      </div>

      {/* Assumptions */}
      <div className="rounded-xl border border-slate-800 bg-[#0c0f14] p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimating Assumptions</div>
        <ul className="mt-2 space-y-1">
          {estimate.assumptions.map((a, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-400">
              <span className="text-amber-500">•</span>
              {a}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onRegen} className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          Regenerate
        </button>
        <button
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Price Materials <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-amber-600/50 bg-amber-500/5' : 'border-slate-800 bg-[#0c0f14]'}`}>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function TotalRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-slate-400' : 'text-slate-200'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-20 text-center">
      <Inbox className="mx-auto h-10 w-10 text-slate-600" />
      <h2 className="mt-3 text-lg font-semibold text-white">No active job</h2>
      <p className="mt-1 text-sm text-slate-400">Start by processing a request in the Intake Inbox.</p>
      <Link
        href="/sunvista/intake"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
      >
        Go to Intake <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
