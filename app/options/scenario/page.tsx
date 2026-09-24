import { GUTTER, PageHeader } from '../_components/phase-shell';
import ScenarioClient from './scenario-client';
import { cn } from '@/lib/utils';

export default function OptionsScenarioPage() {
  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 3:30 — Scenario"
        title="Shock the book and watch what breaks"
        blurb="Drag the sliders: the market down 10% overnight, IV up 80%. Every leg reprices, defined-risk positions cap at their max loss, and the kill-switch ladder resolves to the rung that shock would put the book on. This is the question every trading principal actually asks."
      />
      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <ScenarioClient />
      </div>
    </div>
  );
}
