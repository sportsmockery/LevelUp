import { GUTTER, PageHeader } from '../_components/phase-shell';
import HeadToHeadClient from './head-to-head-client';
import { cn } from '@/lib/utils';

export default function OptionsHeadToHeadPage() {
  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 6:30 — Head to head"
        title="Ahead is not the same as better"
        blurb="Us against his desk, SPY and the PutWrite index on one axis — and, next to the lead, whether the lead means anything yet. A book with no edge beats a book with a real edge about a quarter of the time over twelve months, so a scoreboard without a significance column is decoration."
      />
      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <HeadToHeadClient />
      </div>
    </div>
  );
}
