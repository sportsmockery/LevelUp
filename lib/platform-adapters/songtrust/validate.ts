// Songtrust — publishing administrator. Per-work catalog upload.
// We ship a generic per-work CSV and flag template_pending.

import type { ValidationIssue } from '@/types/platforms';
import type { ReleaseContext } from '@/lib/validation/catalog-validation';

export function songtrustValidate(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const writerById = new Map(ctx.writers.map((w) => [w.id, w]));
  issues.push({ platform: 'songtrust', severity: 'warning', message: 'Songtrust: official template_pending — generated file uses a generic per-work format. Review and reformat to match Songtrust\'s onboarding spec before bulk upload.', blocking: false });
  for (const t of ctx.tracks) {
    const wRows = ctx.trackWriters.filter((tw) => tw.track_id === t.id);
    for (const r of wRows) {
      const w = writerById.get(r.writer_profile_id);
      if (!w) continue;
      if (!w.ipi_number) issues.push({ platform: 'songtrust', severity: 'error', field: `writer.${w.id}.ipi`, message: `Songtrust: writer "${w.legal_name}" needs an IPI.`, blocking: true });
      if (!w.pro) issues.push({ platform: 'songtrust', severity: 'error', field: `writer.${w.id}.pro`, message: `Songtrust: writer "${w.legal_name}" needs a PRO.`, blocking: true });
    }
    if (wRows.length === 0) issues.push({ platform: 'songtrust', severity: 'error', field: `track.${t.id}.writers`, message: `Songtrust: track "${t.track_title}" has no writers.`, blocking: true });
  }
  return issues;
}
