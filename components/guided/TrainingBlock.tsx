// TrainingBlock — render one topic from the TRAINING map.

import { TRAINING, type TopicId } from '@/lib/training/content';

export function TrainingBlock({ topic }: { topic: TopicId }) {
  const t = TRAINING[topic];
  if (!t) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/80 space-y-3">
      <div className="text-base font-heading font-semibold text-white">{t.title}</div>
      <Row label="What it is" body={t.definition} />
      <Row label="Why it matters" body={t.whyItMatters} />
      <Row label="Who gets paid" body={t.whoGetsPaid} />
      <Row label="If skipped" body={t.ifSkipped} tone="warn" />
      <Row label="Common mistake" body={t.commonMistake} tone="warn" />
    </div>
  );
}

function Row({ label, body, tone = 'default' }: { label: string; body: string; tone?: 'default' | 'warn' }) {
  return (
    <div className="flex gap-3">
      <div className={'text-[10px] uppercase tracking-wider min-w-[100px] pt-0.5 ' + (tone === 'warn' ? 'text-amber-300' : 'text-white/40')}>{label}</div>
      <div className="flex-1 leading-relaxed">{body}</div>
    </div>
  );
}
