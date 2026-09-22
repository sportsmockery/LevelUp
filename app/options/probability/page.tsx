import { GUTTER, PageHeader, PendingPanel } from '../_components/phase-shell';
import { cn } from '@/lib/utils';

export default function ThetaProbabilityPage() {
  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 5:30 — Probability"
        title="The honest answer to the 100% question"
        blurb="A Monte Carlo cone over the forward twelve months, with an aggression slider. Drag it to the configuration whose median outcome is +100% and watch the probability of a 20% drawdown climb past half. This is the beat that wins the room — an instrument that volunteers its own probability of ruin is not something a vendor has handed him before."
      />
      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <PendingPanel
          phase="Phase 3–4"
          heading="Probability cone"
          items={[
            'Block bootstrap of historical trade outcomes plus a regime-switching resample, so drawdown clustering survives the resampling.',
            '10,000 paths over a 12-month horizon, compounding at the rulebook sizing.',
            'P(return >= X) for X in {0, 10%, 30%, 50%, 100%}, and P(max drawdown > 20%) — the probability of forfeiting.',
            'Aggression slider re-parameterising buying-power utilization, short-strike delta and duration across a cached grid.',
            'Bootstrap confidence intervals on CAGR, max drawdown and MAR.',
          ]}
        />
      </div>
    </div>
  );
}
