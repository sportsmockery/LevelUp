import { GUTTER, PageHeader, PendingPanel } from '../_components/phase-shell';
import { cn } from '@/lib/utils';

export default function ThetaScenarioPage() {
  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 3:30 — Scenario"
        title="Shock the book and watch what breaks"
        blurb="The client drags the sliders himself: SPX down 10% overnight, IV up 80%. Instant repriced P&L per position, which kill switches trip, and what buying power survives. This is the question every trading principal actually asks."
      />
      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <PendingPanel
          phase="Phase 3–4"
          heading="Scenario shocker"
          items={[
            'Spot, IV and time-decay sliders repricing every open leg through the quant service.',
            'Per-position and portfolio P&L under the shock, against the 20% forfeiture line.',
            'Kill-switch rungs that would trip, and the buying power remaining after they do.',
            'Preset shocks calibrated to real events rather than round numbers.',
          ]}
        />
      </div>
    </div>
  );
}
