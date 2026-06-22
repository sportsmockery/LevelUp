'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Mail, MapPin, AlertTriangle, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { MOCK_EMAILS } from '@/lib/sunvista/mock/emails';
import { IntakeEmail, ParsedIntake, Job, TRADE_LABELS } from '@/lib/sunvista/schemas';
import { useSunVista } from '../store';
import { AiProcessing } from '@/components/sunvista/AiProcessing';
import { URGENCY_STYLES, timeAgo } from '@/lib/sunvista/format';
import { cn } from '@/lib/utils';

const STEPS = [
  'Reading inbound email',
  'Extracting property & scope',
  'Classifying trades & urgency',
  'Structuring the work request',
];

export default function IntakePage() {
  const router = useRouter();
  const { addJob } = useSunVista();
  const [selected, setSelected] = useState<IntakeEmail>(MOCK_EMAILS[0]);
  const [phase, setPhase] = useState<'idle' | 'processing' | 'done'>('idle');
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<ParsedIntake | null>(null);

  function selectEmail(e: IntakeEmail) {
    setSelected(e);
    setPhase('idle');
    setIntake(null);
    setStep(0);
  }

  async function process() {
    setPhase('processing');
    setStep(0);
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 650);
    try {
      const res = await fetch('/api/sunvista/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: selected.id }),
      });
      const data = await res.json();
      clearInterval(ticker);
      setStep(STEPS.length);
      setIntake(data.intake);
      setTimeout(() => setPhase('done'), 400);
    } catch {
      clearInterval(ticker);
      setPhase('idle');
    }
  }

  function createJob() {
    if (!intake) return;
    const num = 1043 + Math.floor(Math.random() * 900);
    const job: Job = {
      id: `job-${num}`,
      jobNumber: `SV-${num}`,
      title: selected.subject.replace(/^(URGENT|RE|FW)[\s—:-]*/i, '').trim(),
      property: selected.property || intake.propertyType,
      trades: intake.trades,
      urgency: intake.urgency,
      stage: 'intake',
      createdAt: new Date().toISOString(),
      sourceEmailId: selected.id,
      intake,
    };
    addJob(job);
    router.push('/sunvista/estimate');
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
            1
          </span>
          Intake Automation
        </div>
        <h1 className="mt-2 text-2xl font-bold text-white">Intake Inbox</h1>
        <p className="mt-1 text-sm text-slate-400">
          Emailed proposals and requests land here. BuildAI reads each one and turns it into a structured job —
          no manual data entry.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* Inbox list */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-xs font-medium text-slate-500">
            <Inbox className="h-3.5 w-3.5" /> {MOCK_EMAILS.length} new requests
          </div>
          {MOCK_EMAILS.map((e) => (
            <button
              key={e.id}
              onClick={() => selectEmail(e)}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors',
                selected.id === e.id
                  ? 'border-amber-600/60 bg-amber-500/5'
                  : 'border-slate-800 bg-[#0c0f14] hover:border-slate-700'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-200">{e.fromName}</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {timeAgo(e.receivedAt)}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-400">{e.subject}</div>
              {e.property && <div className="mt-1 text-[11px] text-slate-600">{e.property}</div>}
            </button>
          ))}
        </div>

        {/* Email + processing */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-[#0c0f14] p-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Mail className="h-4 w-4 text-slate-500" />
                  {selected.subject}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {selected.fromName} &lt;{selected.from}&gt;
                </div>
              </div>
              <button
                onClick={process}
                disabled={phase === 'processing'}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {phase === 'idle' ? 'Process with AI' : phase === 'processing' ? 'Processing…' : 'Re-run'}
              </button>
            </div>
            <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">
              {selected.body}
            </pre>
          </div>

          {phase === 'processing' && <AiProcessing steps={STEPS} currentStep={step} />}

          {phase === 'done' && intake && (
            <div className="rounded-xl border border-emerald-700/40 bg-emerald-500/5 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Sparkles className="h-4 w-4" /> Structured Work Request
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Property" icon={<MapPin className="h-3.5 w-3.5" />}>
                  {intake.propertyAddress}
                  <div className="text-xs text-slate-500">{intake.propertyType}</div>
                </Field>
                <Field label="Requested By">
                  {intake.requestedBy}
                  <div className="text-xs text-slate-500">{intake.contactEmail}</div>
                </Field>
                <Field label="Urgency">
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs capitalize', URGENCY_STYLES[intake.urgency])}>
                    {intake.urgency === 'emergency' && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                    {intake.urgency}
                  </span>
                </Field>
                <Field label="Square Feet">{intake.squareFeet ? intake.squareFeet.toLocaleString() : '—'}</Field>
              </div>

              <div className="mt-4">
                <FieldLabel>Scope Summary</FieldLabel>
                <p className="mt-1 text-sm text-slate-300">{intake.scopeSummary}</p>
              </div>

              <div className="mt-4">
                <FieldLabel>Trades</FieldLabel>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {intake.trades.map((t) => (
                    <span key={t} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {TRADE_LABELS[t] || t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <FieldLabel>Key Requirements</FieldLabel>
                <ul className="mt-1.5 space-y-1">
                  {intake.keyRequirements.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-amber-500">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {intake.budgetSignal && (
                <div className="mt-4 rounded-lg bg-slate-800/50 p-3 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Timeline / budget signal: </span>
                  {intake.budgetSignal}
                </div>
              )}

              <button
                onClick={createJob}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Create Job & Generate Estimate
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{children}</div>;
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
      </FieldLabel>
      <div className="mt-0.5 text-sm text-slate-200">{children}</div>
    </div>
  );
}
