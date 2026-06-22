'use client';

import { useState } from 'react';
import { KanbanSquare, GripVertical } from 'lucide-react';
import { useSunVista } from '../store';
import { JOB_STAGES, JobStage, Job, TRADE_LABELS } from '@/lib/sunvista/schemas';
import { formatCurrency, URGENCY_STYLES } from '@/lib/sunvista/format';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const { jobs, moveJob, activeJobId, setActiveJobId } = useSunVista();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<JobStage | null>(null);

  const pipelineValue = jobs
    .filter((j) => j.stage !== 'invoiced' && j.stage !== 'complete')
    .reduce((s, j) => s + (j.bidTotal || 0), 0);

  return (
    <div className="px-8 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
              5
            </span>
            Project Tracking
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-white">
            <KanbanSquare className="h-6 w-6 text-slate-500" />
            Project Board
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Every job, every stage — drag cards to update status. {jobs.length} active jobs ·{' '}
            <span className="text-amber-400">{formatCurrency(pipelineValue)}</span> in open pipeline.
          </p>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {JOB_STAGES.map((stage) => {
          const colJobs = jobs.filter((j) => j.stage === stage.key);
          return (
            <div
              key={stage.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.key);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
              onDrop={() => {
                if (dragId) moveJob(dragId, stage.key);
                setDragId(null);
                setOverStage(null);
              }}
              className={cn(
                'flex w-64 shrink-0 flex-col rounded-xl border bg-[#0c0f14] transition-colors',
                overStage === stage.key ? 'border-amber-600/60 bg-amber-500/5' : 'border-slate-800'
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stage.label}</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{colJobs.length}</span>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {colJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    active={job.id === activeJobId}
                    onClick={() => setActiveJobId(job.id)}
                    onDragStart={() => setDragId(job.id)}
                    onDragEnd={() => setDragId(null)}
                  />
                ))}
                {colJobs.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-800 py-6 text-center text-[11px] text-slate-700">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobCard({
  job,
  active,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  job: Job;
  active: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'group cursor-grab rounded-lg border bg-[#11151c] p-3 active:cursor-grabbing',
        active ? 'border-amber-600/60 ring-1 ring-amber-600/40' : 'border-slate-800 hover:border-slate-700'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-[10px] font-medium text-slate-500">{job.jobNumber}</span>
        <GripVertical className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-500" />
      </div>
      <div className="mt-0.5 text-sm font-medium leading-snug text-slate-200">{job.title}</div>
      <div className="mt-1 text-[11px] text-slate-500">{job.property}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {job.trades.slice(0, 3).map((t) => (
          <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
            {TRADE_LABELS[t] || t}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] capitalize', URGENCY_STYLES[job.urgency])}>
          {job.urgency}
        </span>
        {job.bidTotal ? <span className="text-xs font-semibold text-slate-300">{formatCurrency(job.bidTotal)}</span> : null}
      </div>
    </div>
  );
}
