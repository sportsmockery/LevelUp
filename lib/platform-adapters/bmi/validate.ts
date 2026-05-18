import type { ReleaseContext } from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';
import { sumShares } from '@/lib/validation/catalog-validation';

export function validateBMI(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (
    field: string,
    message: string,
    severity: 'error' | 'warning' = 'error',
  ) =>
    issues.push({
      platform: 'bmi',
      field,
      message,
      severity,
      blocking: severity === 'error',
    });

  if (!ctx.tracks.length) push('tracks', 'No tracks to register');
  for (const t of ctx.tracks) {
    const writers = ctx.writers[t.id] ?? [];
    if (writers.length === 0) push(`track:${t.id}.writers`, `Track "${t.track_title}" has no writers`);
    const total = sumShares(writers);
    if (Math.round(total * 1000) !== 100000) {
      push(`track:${t.id}.writer_shares`, `Writer shares total ${total}% (must equal 100%)`);
    }
    for (const w of writers) {
      const wp = w.writer_profile_id ? ctx.writerProfiles[w.writer_profile_id] : null;
      if (!wp) push(`track:${t.id}.writer.${w.id}`, 'Writer not linked to profile');
      else {
        if (!wp.ipi_number) push(`writer:${wp.id}.ipi`, `Writer ${wp.legal_name} missing IPI`, 'warning');
        if (!wp.pro || wp.pro === 'Unknown') push(`writer:${wp.id}.pro`, `Writer ${wp.legal_name} missing PRO`, 'warning');
      }
    }
    const publishers = ctx.publishers[t.id] ?? [];
    for (const p of publishers) {
      const pp = p.publisher_profile_id ? ctx.publisherProfiles[p.publisher_profile_id] : null;
      if (pp && !pp.ipi_number) push(`publisher:${pp.id}.ipi`, `Publisher ${pp.publisher_name} missing IPI`, 'warning');
    }
  }
  return issues;
}
