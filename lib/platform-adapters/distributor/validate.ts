// Distributor adapter — validates the fields most distributors require.

import type { ValidationIssue } from '@/types/platforms';
import type { ReleaseContext } from '@/lib/validation/catalog-validation';

export function distributorValidate(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const r = ctx.release;
  if (!r.upc) issues.push({ platform: 'distributor', severity: 'warning', field: 'upc', message: 'Distributor: no UPC set — most distributors will assign one if blank, but supplying your own is preferred for cataloging.', blocking: false });
  if (!r.release_date) issues.push({ platform: 'distributor', severity: 'error', field: 'release_date', message: 'Distributor: release date is required.', blocking: true });
  if (!r.label_name) issues.push({ platform: 'distributor', severity: 'warning', field: 'label_name', message: 'Distributor: label name is blank — most templates expect this.', blocking: false });
  if (!r.artwork_path) issues.push({ platform: 'distributor', severity: 'error', field: 'artwork_path', message: 'Distributor: artwork must be uploaded before distribution.', blocking: true });
  for (const t of ctx.tracks) {
    if (!t.isrc) issues.push({ platform: 'distributor', severity: 'error', field: `track.${t.id}.isrc`, message: `Distributor: track "${t.track_title}" needs an ISRC.`, blocking: true });
    if (!t.duration_ms) issues.push({ platform: 'distributor', severity: 'error', field: `track.${t.id}.duration_ms`, message: `Distributor: track "${t.track_title}" needs a duration.`, blocking: true });
  }
  return issues;
}
