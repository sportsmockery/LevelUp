import type { ReleaseContext } from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';
import { sumShares } from '@/lib/validation/catalog-validation';

export function validateSongtrust(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push({
    platform: 'songtrust',
    field: 'template',
    message: 'Songtrust adapter is template-pending. Confirm the official Songtrust CSV format before upload.',
    severity: 'warning',
    blocking: false,
  });

  const push = (
    field: string,
    message: string,
    severity: 'error' | 'warning' = 'error',
  ) =>
    issues.push({
      platform: 'songtrust',
      field,
      message,
      severity,
      blocking: severity === 'error',
    });

  for (const t of ctx.tracks) {
    const writers = ctx.writers[t.id] ?? [];
    if (writers.length === 0) push(`track:${t.id}.writers`, `"${t.track_title}" has no writers`);
    if (Math.round(sumShares(writers) * 1000) !== 100000) {
      push(`track:${t.id}.writer_shares`, `Writer shares must total 100% for "${t.track_title}"`);
    }
    for (const w of writers) {
      const profile = w.writer_profile_id ? ctx.writerProfiles[w.writer_profile_id] : null;
      if (profile && !profile.ipi_number)
        push(`writer:${profile.id}.ipi`, `Writer "${profile.legal_name}" missing IPI`, 'warning');
    }
  }
  return issues;
}
