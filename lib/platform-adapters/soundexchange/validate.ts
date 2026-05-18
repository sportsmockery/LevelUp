// SoundExchange — collects digital performance royalties for the master.
// Per-recording (ISRC-keyed) registration with featured artist + master owner info.

import type { ValidationIssue } from '@/types/platforms';
import type { ReleaseContext } from '@/lib/validation/catalog-validation';

export function soundexchangeValidate(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const t of ctx.tracks) {
    if (!t.isrc) issues.push({ platform: 'soundexchange', severity: 'error', field: `track.${t.id}.isrc`, message: `SoundExchange: track "${t.track_title}" needs an ISRC.`, blocking: true });
  }
  if (!ctx.release.primary_artist) {
    issues.push({ platform: 'soundexchange', severity: 'error', field: 'primary_artist', message: 'SoundExchange: featured artist (release primary artist) is required for royalty routing.', blocking: true });
  }
  if (!ctx.release.p_line) {
    issues.push({ platform: 'soundexchange', severity: 'warning', field: 'p_line', message: 'SoundExchange: ℗ line should identify the master rights owner.', blocking: false });
  }
  return issues;
}
