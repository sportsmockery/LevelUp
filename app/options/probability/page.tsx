import { GUTTER, PageHeader } from '../_components/phase-shell';
import ProbabilityClient from './probability-client';
import { cn } from '@/lib/utils';

export default function OptionsProbabilityPage() {
  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 5:30 — Probability"
        title="The honest answer to the 100% question"
        blurb="A distribution instead of a promise. Drag the aggression to where +100% sits near the median, and watch the probability of a 20% drawdown — the forfeiture line — climb with it. Every assumption driving the cone is on the page and adjustable."
      />
      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <ProbabilityClient />
      </div>
    </div>
  );
}
