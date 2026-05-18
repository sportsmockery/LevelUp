import type { ReleaseContext } from '@/types/catalog';
import type { GeneratedArtifact } from '@/types/exports';
import type { PlatformId, ValidationIssue } from '@/types/platforms';

import { validateBMI } from './bmi/validate';
import { mapBMI } from './bmi/map';
import { generateBMI } from './bmi/generate';

import { validateMLC } from './mlc/validate';
import { mapMLC } from './mlc/map';
import { generateMLC } from './mlc/generate';

import { validateSongtrust } from './songtrust/validate';
import { mapSongtrust } from './songtrust/map';
import { generateSongtrust } from './songtrust/generate';

import { validateSoundExchange } from './soundexchange/validate';
import { mapSoundExchange } from './soundexchange/map';
import { generateSoundExchange } from './soundexchange/generate';

import { validateCopyright } from './copyright/validate';
import { mapCopyright } from './copyright/map';
import { generateCopyright } from './copyright/generate';

import { validateDistributor } from './distributor/validate';
import { mapDistributor } from './distributor/map';
import { generateDistributor } from './distributor/generate';

export interface PlatformAdapter {
  platform: PlatformId;
  validate: (ctx: ReleaseContext) => ValidationIssue[];
  generate: (ctx: ReleaseContext) => Promise<GeneratedArtifact[]>;
}

export const ADAPTERS: Record<Exclude<PlatformId, 'isrc' | 'master'>, PlatformAdapter> = {
  bmi: {
    platform: 'bmi',
    validate: validateBMI,
    generate: async (ctx) => generateBMI(mapBMI(ctx)),
  },
  mlc: {
    platform: 'mlc',
    validate: validateMLC,
    generate: async (ctx) => generateMLC(mapMLC(ctx)),
  },
  songtrust: {
    platform: 'songtrust',
    validate: validateSongtrust,
    generate: async (ctx) => generateSongtrust(mapSongtrust(ctx)),
  },
  soundexchange: {
    platform: 'soundexchange',
    validate: validateSoundExchange,
    generate: async (ctx) => generateSoundExchange(mapSoundExchange(ctx)),
  },
  copyright: {
    platform: 'copyright',
    validate: validateCopyright,
    generate: async (ctx) => generateCopyright(mapCopyright(ctx)),
  },
  distributor: {
    platform: 'distributor',
    validate: validateDistributor,
    generate: async (ctx) => generateDistributor(mapDistributor(ctx)),
  },
};
