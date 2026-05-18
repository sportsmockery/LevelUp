// The MLC — mechanical license collective for US streaming.
// Per-work registration plus recording references.

import type { ValidationIssue } from '@/types/platforms';
import type { ReleaseContext } from '@/lib/validation/catalog-validation';

export function mlcValidate(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const writerById = new Map(ctx.writers.map((w) => [w.id, w]));
  const publisherById = new Map(ctx.publishers.map((p) => [p.id, p]));

  for (const t of ctx.tracks) {
    const wRows = ctx.trackWriters.filter((tw) => tw.track_id === t.id);
    const pRows = ctx.trackPublishers.filter((tp) => tp.track_id === t.id);

    if (wRows.length === 0) {
      issues.push({ platform: 'mlc', severity: 'error', field: `track.${t.id}.writers`, message: `MLC: track "${t.track_title}" has no writers.`, blocking: true });
    }
    for (const r of wRows) {
      const w = writerById.get(r.writer_profile_id);
      if (!w) continue;
      if (!w.ipi_number) issues.push({ platform: 'mlc', severity: 'error', field: `writer.${w.id}.ipi`, message: `MLC: writer "${w.legal_name}" needs an IPI to register the work.`, blocking: true });
    }
    if (pRows.length === 0) {
      issues.push({ platform: 'mlc', severity: 'warning', field: `track.${t.id}.publishers`, message: `MLC: track "${t.track_title}" has no publisher share allocated — publisher mechanicals will not be paid out.`, blocking: false });
    }
    for (const r of pRows) {
      const p = publisherById.get(r.publisher_profile_id);
      if (!p) continue;
      if (!p.ipi_number) issues.push({ platform: 'mlc', severity: 'error', field: `publisher.${p.id}.ipi`, message: `MLC: publisher "${p.publisher_name}" needs an IPI.`, blocking: true });
    }
    if (!t.isrc) issues.push({ platform: 'mlc', severity: 'warning', field: `track.${t.id}.isrc`, message: `MLC: recording "${t.track_title}" has no ISRC — MLC matches by ISRC, missing it slows payment.`, blocking: false });
  }
  return issues;
}
