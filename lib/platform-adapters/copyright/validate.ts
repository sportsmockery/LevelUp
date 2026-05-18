// US Copyright Office — eCO Form PA (composition) + Form SR (sound recording).

import type { ValidationIssue } from '@/types/platforms';
import type { ReleaseContext } from '@/lib/validation/catalog-validation';

export function copyrightValidate(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const r = ctx.release;

  if (!r.copyright_year) issues.push({ platform: 'copyright', severity: 'error', field: 'copyright_year', message: 'Copyright: year of first publication is required for both PA and SR filings.', blocking: true });
  if (!r.c_line) issues.push({ platform: 'copyright', severity: 'error', field: 'c_line', message: 'Copyright: © line (claimant for the composition) is required for Form PA.', blocking: true });
  if (!r.p_line) issues.push({ platform: 'copyright', severity: 'error', field: 'p_line', message: 'Copyright: ℗ line (claimant for the recording) is required for Form SR.', blocking: true });

  for (const t of ctx.tracks) {
    if (!t.track_title) issues.push({ platform: 'copyright', severity: 'error', field: `track.${t.id}.title`, message: `Copyright: track is missing a title.`, blocking: true });
    const wRows = ctx.trackWriters.filter((tw) => tw.track_id === t.id);
    if (wRows.length === 0) issues.push({ platform: 'copyright', severity: 'error', field: `track.${t.id}.writers`, message: `Copyright: track "${t.track_title}" has no writers (Form PA needs at least one author).`, blocking: true });
  }
  return issues;
}
