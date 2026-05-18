import type { ReleaseContext } from '@/types/catalog';
import type { PlatformId, ValidationIssue } from '@/types/platforms';
import { validateBMI } from '../platform-adapters/bmi/validate';
import { validateMLC } from '../platform-adapters/mlc/validate';
import { validateSongtrust } from '../platform-adapters/songtrust/validate';
import { validateSoundExchange } from '../platform-adapters/soundexchange/validate';
import { validateCopyright } from '../platform-adapters/copyright/validate';
import { validateDistributor } from '../platform-adapters/distributor/validate';

export function validatePlatform(
  platform: PlatformId,
  ctx: ReleaseContext,
): ValidationIssue[] {
  switch (platform) {
    case 'bmi':
      return validateBMI(ctx);
    case 'mlc':
      return validateMLC(ctx);
    case 'songtrust':
      return validateSongtrust(ctx);
    case 'soundexchange':
      return validateSoundExchange(ctx);
    case 'copyright':
      return validateCopyright(ctx);
    case 'distributor':
      return validateDistributor(ctx);
    default:
      return [];
  }
}

export function isBlocked(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.blocking);
}
