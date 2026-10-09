import { GUTTER, PageHeader } from '../_components/phase-shell';
import ReplayClient from './replay-client';
import { cn } from '@/lib/utils';

export default function OptionsReplayPage() {
  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 4:30 — Replay"
        title="Ten years, year by year"
        blurb="The published rules run against the actual S&P path and the actual VIX at every entry, 2016 to 2026 — including whether the strike we would have sold was really breached. Costs charged. Two negative years, a drawdown that came within two points of the forfeiture line, and a bug in our own kill switch that only this run exposed."
      />
      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <ReplayClient />
      </div>
    </div>
  );
}
