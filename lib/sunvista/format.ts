import { JobStage, Urgency } from './schemas';

export function formatCurrency(n: number, opts?: { cents?: boolean }): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts?.cents ? 2 : 0,
    maximumFractionDigits: opts?.cents ? 2 : 0,
  });
}

export const URGENCY_STYLES: Record<Urgency, string> = {
  low: 'bg-slate-700/40 text-slate-300 border-slate-600',
  medium: 'bg-sky-900/40 text-sky-300 border-sky-700',
  high: 'bg-amber-900/40 text-amber-300 border-amber-700',
  emergency: 'bg-red-900/50 text-red-300 border-red-700',
};

export const STAGE_STYLES: Record<JobStage, string> = {
  intake: 'bg-slate-700/40 text-slate-300',
  estimated: 'bg-indigo-900/40 text-indigo-300',
  bid_sent: 'bg-violet-900/40 text-violet-300',
  approved: 'bg-emerald-900/40 text-emerald-300',
  scheduled: 'bg-cyan-900/40 text-cyan-300',
  in_progress: 'bg-amber-900/40 text-amber-300',
  complete: 'bg-green-900/40 text-green-300',
  invoiced: 'bg-teal-900/40 text-teal-300',
};

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
