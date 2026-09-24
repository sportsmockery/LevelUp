/**
 * An EXAMPLE book for the scenario shocker.
 *
 * These are not real positions. Nothing has been traded. The book exists so the
 * shocker opens in a working state rather than an empty shell — every surface
 * that renders it must label it as an example, and it is kept in its own file
 * so it is obvious what is fabricated and easy to delete once Phase 5 supplies
 * real positions from td_positions.
 *
 * The structures, strikes and deltas are drawn from the rulebook's permitted set
 * (§5) and sized to its limits (§7.2): six concurrent positions, max loss <= 5%
 * of a $10,000 account, <= 2 per sector, <= 1 per underlying.
 */

import type { BookPosition } from './pricing';

export const SAMPLE_BOOK_DISCLAIMER =
  'Example positions — nothing has been traded. Sized to the rulebook limits so the ' +
  'shock arithmetic is representative of a real book at this account size.';

export const SAMPLE_BOOK: BookPosition[] = [
  {
    id: 'xlf-pcs',
    symbol: 'XLF',
    structure: 'Put credit spread 38/35',
    spot: 41.18,
    credit: 61,
    maxLoss: 239,
    bpUsed: 239,
    beta: 1.05,
    legs: [
      { right: 'P', strike: 38, qty: -1, iv: 0.19, dte: 34 },
      { right: 'P', strike: 35, qty: 1, iv: 0.21, dte: 34 },
    ],
  },
  {
    id: 'iwm-pcs',
    symbol: 'IWM',
    structure: 'Put credit spread 205/200',
    spot: 224.4,
    credit: 118,
    maxLoss: 382,
    bpUsed: 382,
    beta: 1.18,
    legs: [
      { right: 'P', strike: 205, qty: -1, iv: 0.22, dte: 41 },
      { right: 'P', strike: 200, qty: 1, iv: 0.235, dte: 41 },
    ],
  },
  {
    id: 'spy-ic',
    symbol: 'SPY',
    structure: 'Iron condor 540/535 · 605/610',
    spot: 572.3,
    credit: 145,
    maxLoss: 355,
    bpUsed: 355,
    beta: 1.0,
    legs: [
      { right: 'P', strike: 540, qty: -1, iv: 0.165, dte: 45 },
      { right: 'P', strike: 535, qty: 1, iv: 0.172, dte: 45 },
      { right: 'C', strike: 605, qty: -1, iv: 0.142, dte: 45 },
      { right: 'C', strike: 610, qty: 1, iv: 0.146, dte: 45 },
    ],
  },
  {
    id: 'gld-pcs',
    symbol: 'GLD',
    structure: 'Put credit spread 238/233',
    spot: 251.7,
    credit: 96,
    maxLoss: 404,
    bpUsed: 404,
    beta: 0.15,
    legs: [
      { right: 'P', strike: 238, qty: -1, iv: 0.152, dte: 29 },
      { right: 'P', strike: 233, qty: 1, iv: 0.161, dte: 29 },
    ],
  },
  {
    id: 'eem-csp',
    symbol: 'EEM',
    structure: 'Cash-secured put 42',
    spot: 45.9,
    credit: 74,
    maxLoss: 4126,
    bpUsed: 4126,
    beta: 0.88,
    legs: [{ right: 'P', strike: 42, qty: -1, iv: 0.204, dte: 38 }],
  },
  {
    id: 'xle-ccs',
    symbol: 'XLE',
    structure: 'Call credit spread 98/103',
    spot: 89.6,
    credit: 82,
    maxLoss: 418,
    bpUsed: 418,
    beta: 0.72,
    legs: [
      { right: 'C', strike: 98, qty: -1, iv: 0.238, dte: 31 },
      { right: 'C', strike: 103, qty: 1, iv: 0.249, dte: 31 },
    ],
  },
];

/** Preset shocks, calibrated to real events rather than round numbers. */
export const SHOCK_PRESETS = [
  { id: 'calm', label: 'Quiet week', spotPct: 0.005, ivPct: -0.1, daysForward: 5 },
  { id: 'pullback', label: 'Routine pullback', spotPct: -0.03, ivPct: 0.25, daysForward: 2 },
  { id: 'feb2018', label: 'Feb 2018 (volmageddon)', spotPct: -0.041, ivPct: 1.15, daysForward: 1 },
  { id: 'mar2020', label: 'Mar 2020 (worst day)', spotPct: -0.12, ivPct: 1.5, daysForward: 1 },
  { id: 'melt-up', label: 'Melt-up', spotPct: 0.06, ivPct: -0.2, daysForward: 10 },
] as const;
