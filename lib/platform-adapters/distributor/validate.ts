import type { ReleaseContext } from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';

export function validateDistributor(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (
    field: string,
    message: string,
    severity: 'error' | 'warning' = 'error',
  ) =>
    issues.push({
      platform: 'distributor',
      field,
      message,
      severity,
      blocking: severity === 'error',
    });

  if (!ctx.release.upc) push('release.upc', 'UPC is required for distribution', 'warning');
  if (!ctx.release.release_date) push('release.release_date', 'Release date is required');
  if (!ctx.release.artwork_path) push('release.artwork', 'Artwork file is required by distributors');
  for (const t of ctx.tracks) {
    if (!t.isrc) push(`track:${t.id}.isrc`, `"${t.track_title}" missing ISRC`);
    if (!t.duration_ms) push(`track:${t.id}.duration`, `"${t.track_title}" missing duration`, 'warning');
  }
  return issues;
}
