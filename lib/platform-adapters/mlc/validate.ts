import type { ReleaseContext } from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';
import { sumShares } from '@/lib/validation/catalog-validation';

export function validateMLC(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (
    field: string,
    message: string,
    severity: 'error' | 'warning' = 'error',
  ) =>
    issues.push({
      platform: 'mlc',
      field,
      message,
      severity,
      blocking: severity === 'error',
    });

  issues.push({
    platform: 'mlc',
    field: 'template',
    message: 'MLC adapter is template-pending. Verify field mapping against the official MLC bulk template before submission.',
    severity: 'warning',
    blocking: false,
  });

  for (const t of ctx.tracks) {
    const writers = ctx.writers[t.id] ?? [];
    if (Math.round(sumShares(writers) * 1000) !== 100000) {
      push(`track:${t.id}.writers`, `Writer shares must total 100% for "${t.track_title}"`);
    }
    const publishers = ctx.publishers[t.id] ?? [];
    if (Math.round(sumShares(publishers) * 1000) !== 100000) {
      push(`track:${t.id}.publishers`, `Publisher shares must total 100% for "${t.track_title}"`);
    }
  }
  return issues;
}
