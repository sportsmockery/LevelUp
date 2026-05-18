import type { ReleaseContext } from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';

export function validateSoundExchange(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (
    field: string,
    message: string,
    severity: 'error' | 'warning' = 'error',
  ) =>
    issues.push({
      platform: 'soundexchange',
      field,
      message,
      severity,
      blocking: severity === 'error',
    });

  if (!ctx.release.p_line)
    push('release.p_line', 'P-line owner is required for SoundExchange (master rights holder)');
  if (!ctx.release.label_name) push('release.label_name', 'Label name is required', 'warning');
  for (const t of ctx.tracks) {
    if (!t.isrc) push(`track:${t.id}.isrc`, `Track "${t.track_title}" missing ISRC — required by SoundExchange`);
  }
  return issues;
}
