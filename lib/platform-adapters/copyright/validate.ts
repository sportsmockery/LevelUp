import type { ReleaseContext } from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';

export function validateCopyright(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (
    field: string,
    message: string,
    severity: 'error' | 'warning' = 'error',
  ) =>
    issues.push({
      platform: 'copyright',
      field,
      message,
      severity,
      blocking: severity === 'error',
    });

  if (!ctx.release.copyright_year) push('release.copyright_year', 'Copyright year is required');
  if (!ctx.release.p_line) push('release.p_line', 'Sound recording copyright owner (P-line) is required');
  if (!ctx.release.c_line) push('release.c_line', 'Composition copyright owner (C-line) is required');
  for (const t of ctx.tracks) {
    if ((ctx.writers[t.id] ?? []).length === 0)
      push(`track:${t.id}.writers`, `"${t.track_title}" has no authors`);
  }
  return issues;
}
