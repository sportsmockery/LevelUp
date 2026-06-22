'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tags, Sparkles, ArrowRight, TrendingDown, Inbox, Check } from 'lucide-react';
import { useSunVista } from '../store';
import { AiProcessing } from '@/components/sunvista/AiProcessing';
import { PricingResult } from '@/lib/sunvista/schemas';
import { formatCurrency } from '@/lib/sunvista/format';
import { SUPPLIERS } from '@/lib/sunvista/mock/suppliers';
import { cn } from '@/lib/utils';

const STEPS = [
  ...SUPPLIERS.map((s) => `Querying ${s.name}`),
  'Comparing & selecting best prices',
];

export default function PricingPage() {
  const router = useRouter();
  const { activeJob, updateJob } = useSunVista();
  const [phase, setPhase] = useState<'idle' | 'processing'>('idle');
  const [step, setStep] = useState(0);

  if (!activeJob) return <EmptyState message="Start by processing a request in the Intake Inbox." />;
  if (!activeJob.estimate)
    return <EmptyState message="Generate an estimate first — pricing runs against the estimate's material list." href="/sunvista/estimate" cta="Go to Estimate" />;

  const pricing = activeJob.pricing;

  async function fetchPrices() {
    if (!activeJob?.estimate) return;
    setPhase('processing');
    setStep(0);
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 480);
    try {
      const res = await fetch('/api/sunvista/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimate: activeJob.estimate }),
      });
      const data = await res.json();
      clearInterval(ticker);
      updateJob(activeJob.id, { pricing: data.pricing });
      setPhase('idle');
    } catch {
      clearInterval(ticker);
      setPhase('idle');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
            3
          </span>
          Live Material Pricing
        </div>
        <h1 className="mt-2 text-2xl font-bold text-white">{activeJob.title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          BuildAI sources every material line across SunVista&apos;s supplier network and locks in the best price.
        </p>
      </header>

      {!pricing && phase === 'idle' && (
        <div className="rounded-xl border border-slate-800 bg-[#0c0f14] p-8 text-center">
          <Tags className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-semibold text-white">Fetch Live Supplier Prices</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Compare {SUPPLIERS.length} Albuquerque suppliers in real time and surface the lowest landed cost per item.
          </p>
          <button
            onClick={fetchPrices}
            className="mx-auto mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> Fetch Live Prices
          </button>
        </div>
      )}

      {phase === 'processing' && <AiProcessing steps={STEPS} currentStep={step} title="Sourcing materials…" />}

      {pricing && phase === 'idle' && (
        <PricingView pricing={pricing} onContinue={() => router.push('/sunvista/design')} onRefresh={fetchPrices} />
      )}
    </div>
  );
}

function PricingView({
  pricing,
  onContinue,
  onRefresh,
}: {
  pricing: PricingResult;
  onContinue: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Card label="Retail Cost" value={formatCurrency(pricing.retailTotal)} />
        <Card label="Best Sourced Cost" value={formatCurrency(pricing.bestTotal)} accent="text-emerald-400" />
        <Card
          label="Total Savings"
          value={formatCurrency(pricing.totalSavings)}
          accent="text-amber-400"
          icon={<TrendingDown className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="space-y-3">
        {pricing.quotes.map((q, i) => {
          const sorted = [...q.suppliers].sort((a, b) => a.price - b.price);
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-slate-800 bg-[#0c0f14]">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                <div className="text-sm font-medium text-slate-200">
                  {q.description}
                  <span className="ml-2 text-xs text-slate-500">
                    {q.quantity.toLocaleString()} {q.unit}
                  </span>
                </div>
                <div className="text-xs text-emerald-400">Save {formatCurrency(q.savings)}</div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-5">
                {sorted.map((s) => {
                  const isBest = s.supplier === q.bestSupplier;
                  return (
                    <div
                      key={s.supplier}
                      className={cn('p-3', isBest ? 'bg-emerald-500/10' : 'bg-[#0c0f14]')}
                    >
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        {isBest && <Check className="h-3 w-3 text-emerald-400" />}
                        <span className="truncate">{s.supplier}</span>
                      </div>
                      <div className={cn('mt-0.5 text-sm font-semibold', isBest ? 'text-emerald-300' : 'text-slate-300')}>
                        {formatCurrency(s.price, { cents: true })}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {s.availability} · {s.leadDays}d
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onRefresh} className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          Refresh prices
        </button>
        <button
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Generate Site Plan <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Card({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0c0f14] p-4">
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <div className={cn('mt-1 text-xl font-bold', accent || 'text-white')}>{value}</div>
    </div>
  );
}

function EmptyState({ message, href = '/sunvista/intake', cta = 'Go to Intake' }: { message: string; href?: string; cta?: string }) {
  return (
    <div className="mx-auto max-w-2xl px-8 py-20 text-center">
      <Inbox className="mx-auto h-10 w-10 text-slate-600" />
      <h2 className="mt-3 text-lg font-semibold text-white">Nothing to price yet</h2>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
      <Link href={href} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black">
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
