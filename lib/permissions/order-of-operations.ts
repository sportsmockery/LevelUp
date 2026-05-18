import type { Release, Track, TrackWriter, TrackPublisher } from '@/types/catalog';
import type { PlatformRegistration } from '@/types/platforms';

export type StepId =
  | 'organization_setup'
  | 'artist_profile'
  | 'writer_profile'
  | 'publisher_decision'
  | 'release_setup'
  | 'track_setup'
  | 'writer_splits'
  | 'publisher_splits'
  | 'isrc_assignment'
  | 'platform_validation'
  | 'file_generation'
  | 'manual_submission'
  | 'confirmation_tracking'
  | 'workbook_archive';

export interface Step {
  id: StepId;
  order: number;
  title: string;
  description: string;
}

export const STEPS: Step[] = [
  { id: 'organization_setup', order: 1, title: 'Organization setup', description: 'Create your organization and invite collaborators.' },
  { id: 'artist_profile', order: 2, title: 'Artist profile', description: 'Add the artist whose music you are publishing.' },
  { id: 'writer_profile', order: 3, title: 'Writer profile', description: 'Add every songwriter on the release.' },
  { id: 'publisher_decision', order: 4, title: 'Publisher / admin decision', description: 'Decide who publishes the work (self, company, or admin).' },
  { id: 'release_setup', order: 5, title: 'Release setup', description: 'Enter release-level metadata: title, type, UPC, artwork.' },
  { id: 'track_setup', order: 6, title: 'Track setup', description: 'Enter track-level metadata: title, duration, ISRC, credits.' },
  { id: 'writer_splits', order: 7, title: 'Writer splits', description: 'Assign writer shares — must total 100%.' },
  { id: 'publisher_splits', order: 8, title: 'Publisher splits', description: 'Assign publisher shares — must total 100%.' },
  { id: 'isrc_assignment', order: 9, title: 'ISRC assignment', description: 'Reserve or assign an ISRC for each recording.' },
  { id: 'platform_validation', order: 10, title: 'Platform validation', description: 'Run validation against each registration platform.' },
  { id: 'file_generation', order: 11, title: 'File generation', description: 'Generate platform-ready files and packets.' },
  { id: 'manual_submission', order: 12, title: 'Manual submission', description: 'Submit the generated files to each platform.' },
  { id: 'confirmation_tracking', order: 13, title: 'Confirmation tracking', description: 'Record confirmation numbers and submission dates.' },
  { id: 'workbook_archive', order: 14, title: 'Workbook archive', description: 'Generate the Master Workbook for the catalog.' },
];

export interface StepStatus {
  step: Step;
  state: 'complete' | 'incomplete' | 'overridden' | 'locked';
  missing: string[];
  override?: { reason: string; by: string; at: string };
}

export interface OrderContext {
  release: Release | null;
  tracks: Track[];
  writers: Record<string, TrackWriter[]>;
  publishers: Record<string, TrackPublisher[]>;
  registrations: PlatformRegistration[];
  generatedFileCount: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + Number(b || 0), 0);
const allTracksMeet = (tracks: Track[], pred: (t: Track) => boolean) =>
  tracks.length > 0 && tracks.every(pred);

export function evaluateSteps(ctx: OrderContext): StepStatus[] {
  const overrides = ctx.release?.step_overrides ?? {};
  return STEPS.map((step) => {
    if (overrides[step.id]) {
      return { step, state: 'overridden', missing: [], override: overrides[step.id] };
    }
    const result = evaluateStep(step.id, ctx);
    return { step, ...result };
  });
}

function evaluateStep(
  id: StepId,
  ctx: OrderContext,
): { state: StepStatus['state']; missing: string[] } {
  const missing: string[] = [];
  switch (id) {
    case 'organization_setup':
      return { state: 'complete', missing: [] }; // implied by reaching this view
    case 'artist_profile':
      return { state: 'complete', missing: [] }; // tracked separately
    case 'writer_profile':
      return { state: 'complete', missing: [] };
    case 'publisher_decision':
      return { state: 'complete', missing: [] };
    case 'release_setup':
      if (!ctx.release) missing.push('release not created');
      else {
        if (!ctx.release.release_title) missing.push('release_title');
        if (!ctx.release.primary_artist) missing.push('primary_artist');
      }
      return { state: missing.length ? 'incomplete' : 'complete', missing };
    case 'track_setup':
      if (!ctx.tracks.length) missing.push('no tracks');
      else if (!allTracksMeet(ctx.tracks, (t) => !!t.track_title)) missing.push('track titles');
      return { state: missing.length ? 'incomplete' : 'complete', missing };
    case 'writer_splits': {
      for (const t of ctx.tracks) {
        const total = sum((ctx.writers[t.id] ?? []).map((w) => w.share_percent));
        if (Math.round(total * 1000) !== 100000) {
          missing.push(`${t.track_title || t.id}: writers sum ${total}%`);
        }
      }
      return { state: missing.length ? 'incomplete' : 'complete', missing };
    }
    case 'publisher_splits': {
      for (const t of ctx.tracks) {
        const total = sum((ctx.publishers[t.id] ?? []).map((p) => p.share_percent));
        if (Math.round(total * 1000) !== 100000) {
          missing.push(`${t.track_title || t.id}: publishers sum ${total}%`);
        }
      }
      return { state: missing.length ? 'incomplete' : 'complete', missing };
    }
    case 'isrc_assignment':
      for (const t of ctx.tracks) {
        if (!t.isrc) missing.push(`${t.track_title || t.id}: no ISRC`);
      }
      return { state: missing.length ? 'incomplete' : 'complete', missing };
    case 'platform_validation':
      return { state: ctx.generatedFileCount > 0 ? 'complete' : 'incomplete', missing: missing };
    case 'file_generation':
      return { state: ctx.generatedFileCount > 0 ? 'complete' : 'incomplete', missing: [] };
    case 'manual_submission': {
      const submitted = ctx.registrations.some(
        (r) => r.status === 'submitted' || r.status === 'pending' || r.status === 'confirmed',
      );
      return { state: submitted ? 'complete' : 'incomplete', missing: [] };
    }
    case 'confirmation_tracking': {
      const confirmed = ctx.registrations.some((r) => r.status === 'confirmed');
      return { state: confirmed ? 'complete' : 'incomplete', missing: [] };
    }
    case 'workbook_archive': {
      // Counted via generatedFileCount for the 'master' platform.
      // For MVP simplicity we treat any generated file as partial progress.
      return { state: ctx.generatedFileCount > 0 ? 'complete' : 'incomplete', missing: [] };
    }
  }
}

export function canAdvance(
  step: StepId,
  ctx: OrderContext,
): { allowed: boolean; missing: string[] } {
  const idx = STEPS.findIndex((s) => s.id === step);
  if (idx <= 0) return { allowed: true, missing: [] };
  const statuses = evaluateSteps(ctx);
  const blocking = statuses
    .slice(0, idx)
    .filter((s) => s.state === 'incomplete');
  return {
    allowed: blocking.length === 0,
    missing: blocking.flatMap((s) => [`${s.step.title}: ${s.missing.join(', ') || 'not complete'}`]),
  };
}
