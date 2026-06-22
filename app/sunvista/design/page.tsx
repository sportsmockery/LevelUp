'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PencilRuler, Sparkles, ArrowRight, Download, Inbox, FileText } from 'lucide-react';
import { useSunVista } from '../store';
import { AiProcessing } from '@/components/sunvista/AiProcessing';
import { SitePlanSVG } from '@/components/sunvista/SitePlanSVG';
import { SitePlanSpec } from '@/lib/sunvista/schemas';

const STEPS = [
  'Reading scope & property data',
  'Laying out zones & rooms',
  'Placing walls & dimensions',
  'Annotating scope & composing the sheet',
];

export default function DesignPage() {
  const router = useRouter();
  const { activeJob, updateJob } = useSunVista();
  const [phase, setPhase] = useState<'idle' | 'processing'>('idle');
  const [step, setStep] = useState(0);
  const [exporting, setExporting] = useState(false);

  if (!activeJob) return <EmptyState message="Start by processing a request in the Intake Inbox." />;
  if (!activeJob.intake) return <EmptyState message="This job has no scope yet." />;

  const plan = activeJob.plan;

  async function generate() {
    if (!activeJob) return;
    setPhase('processing');
    setStep(0);
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 720);
    try {
      const res = await fetch('/api/sunvista/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake: activeJob.intake }),
      });
      const data = await res.json();
      clearInterval(ticker);
      updateJob(activeJob.id, { plan: data.plan });
      setPhase('idle');
    } catch {
      clearInterval(ticker);
      setPhase('idle');
    }
  }

  async function exportDxf(spec: SitePlanSpec) {
    setExporting(true);
    try {
      const res = await fetch('/api/sunvista/export-dxf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: spec }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (spec.title || 'sunvista-plan').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.dxf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function sendBid() {
    if (!activeJob) return;
    updateJob(activeJob.id, { stage: 'bid_sent' });
    router.push('/sunvista/projects');
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
            4
          </span>
          CAD / Site Simulation
        </div>
        <h1 className="mt-2 text-2xl font-bold text-white">{activeJob.title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          BuildAI drafts a conceptual site/floor plan from the scope. Export to AutoCAD (.dxf) for detailed drafting.
        </p>
      </header>

      {!plan && phase === 'idle' && (
        <div className="rounded-xl border border-slate-800 bg-[#0c0f14] p-8 text-center">
          <PencilRuler className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-semibold text-white">Generate Site Plan</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Produce a schematic layout of the work area — zones, walls, dimensions, and scope callouts — ready to refine in CAD.
          </p>
          <button
            onClick={generate}
            className="mx-auto mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> Generate Site Plan
          </button>
        </div>
      )}

      {phase === 'processing' && <AiProcessing steps={STEPS} currentStep={step} title="BuildAI is drafting…" />}

      {plan && phase === 'idle' && (
        <div className="space-y-4">
          <SitePlanSVG spec={plan} />

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-[#0c0f14] px-4 py-3">
            {plan.legend.map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-slate-300">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: l.color }} />
                {l.label}
              </div>
            ))}
            <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              {plan.zones.length} zones · {plan.dimensions.length} dimensions
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => exportDxf(plan)}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting…' : 'Export to AutoCAD (.dxf)'}
            </button>
            <div className="flex items-center gap-3">
              <button onClick={generate} className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
                Regenerate
              </button>
              <button
                onClick={sendBid}
                className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Send Bid & Track <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-8 py-20 text-center">
      <Inbox className="mx-auto h-10 w-10 text-slate-600" />
      <h2 className="mt-3 text-lg font-semibold text-white">No active job</h2>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
      <Link href="/sunvista/intake" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black">
        Go to Intake <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
