// Music Publishing — aggregator that runs each platform adapter's validate()
// on a shared ReleaseContext, plus the general catalog rules.

import type { PlatformId, ValidationIssue } from '@/types/platforms';
import { validateRelease, type ReleaseContext } from '@/lib/validation/catalog-validation';
import { bmiValidate } from '@/lib/platform-adapters/bmi/validate';

export function validateForPlatform(platform: PlatformId, ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateRelease(ctx));
  switch (platform) {
    case 'bmi':
      issues.push(...bmiValidate(ctx));
      break;
    case 'mlc':
    case 'songtrust':
    case 'soundexchange':
    case 'copyright':
    case 'distributor':
    case 'isrc':
    case 'master':
      issues.push({ platform, severity: 'warning', message: `${platform} adapter not yet built — MVP slice covers BMI only.`, blocking: true });
      break;
  }
  return issues;
}
