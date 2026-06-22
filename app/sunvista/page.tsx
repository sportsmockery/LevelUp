'use client';

import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Briefcase, DollarSign, TrendingUp, FileCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useSunVista } from './store';
import { JOB_STAGES, TRADE_LABELS, Trade } from '@/lib/sunvista/schemas';
import { formatCurrency, STAGE_STYLES, timeAgo } from '@/lib/sunvista/format';
import { cn } from '@/lib/utils';

const TRADE_COLORS = ['#f59e0b', '#0ea5e9', '#10b981', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#6366f1'];

export default function DashboardPage() {
  const { jobs } = useSunVista();

  const openJobs = jobs.filter((j) => j.stage !== 'complete' && j.stage !== 'invoiced');
  const openPipeline = openJobs.reduce((s, j) => s + (j.bidTotal || 0), 0);
  const wonValue = jobs
    .filter((j) => ['approved', 'scheduled', 'in_progress', 'complete', 'invoiced'].includes(j.stage))
    .reduce((s, j) => s + (j.bidTotal || 0), 0);
  const avgBid = jobs.length ? jobs.reduce((s, j) => s + (j.bidTotal || 0), 0) / jobs.length : 0;

  const stageData = JOB_STAGES.map((s) => ({
    name: s.label,
    value: jobs.filter((j) => j.stage === s.key).reduce((sum, j) => sum + (j.bidTotal || 0), 0),
    count: jobs.filter((j) => j.stage === s.key).length,
  }));

  const tradeCounts = new Map<Trade, number>();
  jobs.forEach((j) => j.trades.forEach((t) => tradeCounts.set(t, (tradeCounts.get(t) || 0) + 1)));
  const tradeData = Array.from(tradeCounts.entries()).map(([t, count]) => ({
    name: TRADE_LABELS[t] || t,
    value: count,
  }));

  const recent = [...jobs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* Hero */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-amber-700/30 bg-gradient-to-br from-amber-500/10 via-[#0c0f14] to-[#0c0f14] p-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-400">
              <Sparkles className="h-3.5 w-3.5" /> SunVista Enterprises · General Contracting
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">BuildAI Command Center</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              From an emailed request to a priced bid with a CAD-ready site plan — automated end to end. Run the live
              demo to see a real request become a tracked job in under a minute.
            </p>
          </div>
          <Link
            href="/sunvista/intake"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Start Live Demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Active Jobs" value={openJobs.length.toString()} icon={<Briefcase className="h-4 w-4" />} />
        <Kpi label="Open Pipeline" value={formatCurrency(openPipeline)} icon={<DollarSign className="h-4 w-4" />} accent />
        <Kpi label="Won / In Production" value={formatCurrency(wonValue)} icon={<FileCheck className="h-4 w-4" />} />
        <Kpi label="Avg Bid" value={formatCurrency(avgBid)} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-800 bg-[#0c0f14] p-5">
          <div className="mb-4 text-sm font-semibold text-white">Pipeline Value by Stage</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stageData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                cursor={{ fill: '#1e293b40' }}
                contentStyle={{ background: '#0c0f14', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => formatCurrency(typeof v === 'number' ? v : Number(v))}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {stageData.map((_, i) => (
                  <Cell key={i} fill="#f59e0b" fillOpacity={0.5 + (i / stageData.length) * 0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c0f14] p-5">
          <div className="mb-4 text-sm font-semibold text-white">Work Mix by Trade</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={tradeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {tradeData.map((_, i) => (
                  <Cell key={i} fill={TRADE_COLORS[i % TRADE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0c0f14', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2">
            {tradeData.map((t, i) => (
              <span key={t.name} className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TRADE_COLORS[i % TRADE_COLORS.length] }} />
                {t.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-[#0c0f14] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Recent Jobs</div>
          <Link href="/sunvista/projects" className="text-xs text-amber-400 hover:underline">
            View board →
          </Link>
        </div>
        <div className="divide-y divide-slate-800">
          {recent.map((job) => (
            <div key={job.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-200">{job.title}</div>
                <div className="text-xs text-slate-500">
                  {job.jobNumber} · {job.property} · {timeAgo(job.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {job.bidTotal ? <span className="text-sm font-semibold text-slate-300">{formatCurrency(job.bidTotal)}</span> : null}
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] capitalize', STAGE_STYLES[job.stage])}>
                  {job.stage.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-4', accent ? 'border-amber-600/40 bg-amber-500/5' : 'border-slate-800 bg-[#0c0f14]')}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
        <span className={accent ? 'text-amber-400' : 'text-slate-500'}>{icon}</span>
        {label}
      </div>
      <div className={cn('mt-1.5 text-2xl font-bold', accent ? 'text-amber-400' : 'text-white')}>{value}</div>
    </div>
  );
}
