// Music Publishing — server-side checklist evaluation + override.
// Pure step definitions live in order-of-operations-steps.ts so client code
// can import STEPS without pulling in the server-only Supabase client.

import { getServiceClient } from '@/lib/supabase-publishing-server';
import { createAuditLog } from '@/lib/audit/createAuditLog';
import { STEPS, type StepId, type StepState } from './order-of-operations-steps';

export { STEPS };
export type { StepId, StepState, StepDef } from './order-of-operations-steps';

interface ReleaseSnapshot {
  release: { id: string; release_title: string; artwork_path: string | null; step_overrides: Record<string, { reason: string; by: string; at: string }> } | null;
  trackCount: number;
  tracksWithIsrc: number;
  writerCount: number;
  publisherCount: number;
  artistCount: number;
  writerSplitsValid: boolean;
  publisherSplitsValid: boolean;
  allWritersApproved: boolean;
  hasGeneratedFiles: boolean;
  hasConfirmedRegistration: boolean;
}

async function snapshot(orgId: string, releaseId: string): Promise<ReleaseSnapshot> {
  const supabase = getServiceClient();
  if (!supabase) {
    return {
      release: null,
      trackCount: 0,
      tracksWithIsrc: 0,
      writerCount: 0,
      publisherCount: 0,
      artistCount: 0,
      writerSplitsValid: false,
      publisherSplitsValid: false,
      allWritersApproved: false,
      hasGeneratedFiles: false,
      hasConfirmedRegistration: false,
    };
  }

  const [{ data: release }, { data: tracks }, { count: writerCount }, { count: publisherCount }, { count: artistCount }, { data: files }, { data: regs }] = await Promise.all([
    supabase.from('releases').select('id,release_title,artwork_path,step_overrides').eq('id', releaseId).maybeSingle(),
    supabase.from('tracks').select('id,isrc').eq('release_id', releaseId),
    supabase.from('writer_profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('publisher_profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('artist_profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('generated_files').select('id').eq('release_id', releaseId).limit(1),
    supabase.from('platform_registrations').select('status').eq('release_id', releaseId).in('status', ['submitted', 'confirmed', 'complete']),
  ]);

  const trackIds = (tracks ?? []).map((t) => t.id);
  let writerSplitsValid = trackIds.length > 0;
  let publisherSplitsValid = trackIds.length > 0;
  let allWritersApproved = trackIds.length > 0;

  if (trackIds.length > 0) {
    const [{ data: tw }, { data: tp }] = await Promise.all([
      supabase.from('track_writers').select('track_id,share_percent,approval_status').in('track_id', trackIds),
      supabase.from('track_publishers').select('track_id,share_percent').in('track_id', trackIds),
    ]);
    for (const trackId of trackIds) {
      const wRows = (tw ?? []).filter((r) => r.track_id === trackId);
      const pRows = (tp ?? []).filter((r) => r.track_id === trackId);
      const wSum = wRows.reduce((a, r) => a + Number(r.share_percent ?? 0), 0);
      const pSum = pRows.reduce((a, r) => a + Number(r.share_percent ?? 0), 0);
      if (wRows.length === 0 || Math.abs(wSum - 100) > 0.01) writerSplitsValid = false;
      if (pRows.length === 0 || Math.abs(pSum - 100) > 0.01) publisherSplitsValid = false;
      if (wRows.some((r) => r.approval_status !== 'approved')) allWritersApproved = false;
    }
  }

  const tracksWithIsrc = (tracks ?? []).filter((t) => !!t.isrc).length;

  return {
    release: release ?? null,
    trackCount: trackIds.length,
    tracksWithIsrc,
    writerCount: writerCount ?? 0,
    publisherCount: publisherCount ?? 0,
    artistCount: artistCount ?? 0,
    writerSplitsValid,
    publisherSplitsValid,
    allWritersApproved,
    hasGeneratedFiles: (files ?? []).length > 0,
    hasConfirmedRegistration: (regs ?? []).length > 0,
  };
}

function evaluateStep(step: StepId, s: ReleaseSnapshot): boolean {
  switch (step) {
    case 'create_org':                 return true; // implicit when org_id given
    case 'add_artist':                 return s.artistCount > 0;
    case 'add_writers':                return s.writerCount > 0;
    case 'add_publishers':             return s.publisherCount > 0;
    case 'create_release':             return !!s.release;
    case 'upload_artwork':             return !!s.release?.artwork_path;
    case 'add_tracks':                 return s.trackCount > 0;
    case 'assign_isrcs':               return s.trackCount > 0 && s.tracksWithIsrc === s.trackCount;
    case 'assign_writer_splits':       return s.writerSplitsValid;
    case 'split_approvals':            return s.allWritersApproved;
    case 'assign_publisher_splits':    return s.publisherSplitsValid;
    case 'validate_platforms':         return s.hasGeneratedFiles; // generation runs validation first
    case 'generate_exports':           return s.hasGeneratedFiles;
    case 'record_registration_status': return s.hasConfirmedRegistration;
  }
}

export async function getChecklist(orgId: string, releaseId: string): Promise<StepState[]> {
  const s = await snapshot(orgId, releaseId);
  const overrides = s.release?.step_overrides ?? {};
  const completedMap = new Map<StepId, boolean>();
  for (const step of STEPS) completedMap.set(step.id, evaluateStep(step.id, s));

  return STEPS.map((step) => {
    const override = overrides[step.id];
    if (override) {
      return { id: step.id, title: step.title, blurb: step.blurb, status: 'overridden', missing: [], override };
    }
    const missing = step.dependsOn.filter((d) => !completedMap.get(d) && !overrides[d]);
    const completed = completedMap.get(step.id) === true;
    if (completed) return { id: step.id, title: step.title, blurb: step.blurb, status: 'completed', missing: [] };
    if (missing.length > 0) return { id: step.id, title: step.title, blurb: step.blurb, status: 'locked', missing };
    return { id: step.id, title: step.title, blurb: step.blurb, status: 'pending', missing: [] };
  });
}

export async function overrideStep(opts: {
  orgId: string;
  releaseId: string;
  step: StepId;
  reason: string;
  userId: string;
}): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  const { data: rel } = await supabase
    .from('releases')
    .select('step_overrides')
    .eq('id', opts.releaseId)
    .maybeSingle();
  const existing = (rel?.step_overrides ?? {}) as Record<string, unknown>;
  existing[opts.step] = { reason: opts.reason, by: opts.userId, at: new Date().toISOString() };
  await supabase.from('releases').update({ step_overrides: existing }).eq('id', opts.releaseId);
  await createAuditLog({
    orgId: opts.orgId,
    userId: opts.userId,
    entityType: 'release',
    entityId: opts.releaseId,
    action: 'step_override_recorded',
    newValue: { step: opts.step, reason: opts.reason },
  });
}
