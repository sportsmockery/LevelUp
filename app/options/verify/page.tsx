import { GUTTER, PageHeader, PendingPanel } from '../_components/phase-shell';
import { cn } from '@/lib/utils';

export default function ThetaVerifyPage() {
  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Proof mechanism"
        title="Verify us, rather than trust us"
        blurb="Every signal, order, fill and daily mark is appended to a hash chain, written before the order is submitted. Each trading day the chain head is committed to a public repository, so GitHub's timestamp is a third-party witness we do not control. This page re-walks the whole chain in the client's own browser, without an account."
      />
      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <PendingPanel
          phase="Phase 5"
          heading="Public chain verifier"
          items={[
            'chain_hash = sha256(prev_hash || canonical_json(payload)), recomputed client-side over td_v_public_anchors and the published log.',
            'Green or red per daily anchor, with the first divergent sequence number named when a chain fails.',
            'Each anchor linked through to its public commit, so the timestamp can be checked at the source.',
            'Append-only enforced in the database as well: td_audit_log refuses UPDATE and DELETE at the trigger level.',
          ]}
        />
      </div>
    </div>
  );
}
