import { GUTTER, PageHeader, PendingPanel } from '../_components/phase-shell';
import { cn } from '@/lib/utils';

export default function ThetaRiskPage() {
  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 2:30 — Risk"
        title="What the book is actually carrying"
        blurb="Beta-weighted net delta, net theta and vega, buying-power utilization, sector concentration, and the kill-switch ladder with the current rung lit. Showing a skeptical trader the de-risking machinery is worth more than showing him the returns."
      />
      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <PendingPanel
          phase="Phase 3–5"
          heading="Live risk panel"
          items={[
            'Greeks and buying power from td_equity_snapshots, marked at every management sweep.',
            'SPY-beta-weighted delta held between -0.30 and +0.30 per $1k of equity — the check that stops a premium book quietly becoming a leveraged long.',
            'Sector and per-underlying concentration against the caps in rulebook §7.2.',
            'Kill-switch rung with the values that put it there, plus the three independent overlays (VIX level, term-structure backwardation, correlation spike).',
            'Transition history from td_risk_events, each entry written to the audit chain.',
          ]}
        />
      </div>
    </div>
  );
}
