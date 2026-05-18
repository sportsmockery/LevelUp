// BMI-specific validation that runs on top of the general catalog rules.

import type { ValidationIssue } from '@/types/platforms';
import type { ReleaseContext } from '@/lib/validation/catalog-validation';

export function bmiValidate(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const writerById = new Map(ctx.writers.map((w) => [w.id, w]));

  for (const track of ctx.tracks) {
    const wRows = ctx.trackWriters.filter((tw) => tw.track_id === track.id);
    for (const r of wRows) {
      const w = writerById.get(r.writer_profile_id);
      if (!w) continue;
      // BMI requires that any writer affiliated with BMI uses their BMI IPI.
      // We can't verify the affiliation, but flag writers with no IPI as a BMI blocker.
      if (!w.ipi_number) {
        issues.push({
          platform: 'bmi',
          severity: 'error',
          field: `writer.${w.id}.ipi_number`,
          message: `BMI: writer "${w.legal_name}" needs an IPI number to register.`,
          blocking: true,
        });
      }
      // BMI's writer roles map to ours 1:1; no extra checks needed.
    }
    if (!track.duration_ms) {
      issues.push({
        platform: 'bmi',
        severity: 'error',
        field: `track.${track.id}.duration_ms`,
        message: `BMI: track "${track.track_title}" needs a duration in seconds.`,
        blocking: true,
      });
    }
  }

  return issues;
}
