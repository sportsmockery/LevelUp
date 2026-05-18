// Music Publishing — aggregator that runs each platform adapter's validate()
// on a shared ReleaseContext, plus the general catalog rules.

import type { PlatformId, ValidationIssue } from '@/types/platforms';
import { validateRelease, type ReleaseContext } from '@/lib/validation/catalog-validation';
import { bmiValidate } from '@/lib/platform-adapters/bmi/validate';
import { distributorValidate } from '@/lib/platform-adapters/distributor/validate';
import { soundexchangeValidate } from '@/lib/platform-adapters/soundexchange/validate';
import { songtrustValidate } from '@/lib/platform-adapters/songtrust/validate';
import { mlcValidate } from '@/lib/platform-adapters/mlc/validate';
import { copyrightValidate } from '@/lib/platform-adapters/copyright/validate';

export function validateForPlatform(platform: PlatformId, ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateRelease(ctx));
  switch (platform) {
    case 'bmi':           issues.push(...bmiValidate(ctx)); break;
    case 'distributor':   issues.push(...distributorValidate(ctx)); break;
    case 'soundexchange': issues.push(...soundexchangeValidate(ctx)); break;
    case 'songtrust':     issues.push(...songtrustValidate(ctx)); break;
    case 'mlc':           issues.push(...mlcValidate(ctx)); break;
    case 'copyright':     issues.push(...copyrightValidate(ctx)); break;
    case 'isrc':
    case 'master':
      issues.push({ platform, severity: 'warning', message: `${platform} adapter not yet built.`, blocking: true });
      break;
  }
  return issues;
}
