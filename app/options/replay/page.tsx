import { PageHeader, PendingPanel } from '../_components/phase-shell';

export default function ThetaReplayPage() {
  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Beat 4:30 — Replay"
        title="What happens when it goes wrong"
        blurb="One click replays the engine through February 2018, March 2020 and October 2022 against historical chain data — the ladder stepping down, positions closing, buying power contracting. A strategy that has never been shown failing has not been shown."
      />
      <div className="px-8 py-7">
        <PendingPanel
          phase="Phase 2–4"
          heading="Historical stress replay"
          items={[
            'Deterministic playback of a backtest run, seeded and reproducible from (config, rules_version, data_version, seed).',
            'Regime slices reported individually rather than averaged: Q1 2018, March 2020, the 2022 bear, the 2023-24 low-vol melt-up.',
            'Kill-switch transitions surfaced on the timeline at the moment they fired.',
            'Out-of-sample windows labelled as such, per the pre-registered protocol in build plan §9.',
          ]}
        />
      </div>
    </div>
  );
}
