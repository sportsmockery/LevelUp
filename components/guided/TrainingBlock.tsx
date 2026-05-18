'use client';

import { TRAINING, TrainingTopic } from '@/lib/training/content';

export function TrainingBlock({ topic }: { topic: TrainingTopic }) {
  const entry = TRAINING[topic];
  if (!entry) return null;
  return (
    <details className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 my-3 text-sm">
      <summary className="cursor-pointer font-medium text-zinc-100">{entry.title}</summary>
      <div className="mt-3 space-y-2 text-zinc-300">
        <p><span className="text-zinc-500 text-xs uppercase mr-2">Definition</span>{entry.definition}</p>
        <p><span className="text-zinc-500 text-xs uppercase mr-2">Why it matters</span>{entry.whyItMatters}</p>
        <p><span className="text-zinc-500 text-xs uppercase mr-2">Who gets paid</span>{entry.whoGetsPaid}</p>
        <p><span className="text-zinc-500 text-xs uppercase mr-2">If you skip it</span>{entry.ifSkipped}</p>
        <p><span className="text-zinc-500 text-xs uppercase mr-2">Common mistake</span>{entry.commonMistake}</p>
      </div>
    </details>
  );
}

export default TrainingBlock;
