// Seeded supplier roster used by the pricing engine to simulate a live
// multi-supplier price comparison for Albuquerque material sourcing.
export interface Supplier {
  id: string;
  name: string;
  // Multiplier applied to a material's retail unit price to simulate each
  // supplier's typical pricing posture (contractor/pro accounts run below retail).
  priceFactor: number;
  baseLeadDays: number;
}

export const SUPPLIERS: Supplier[] = [
  { id: 'hd-pro', name: 'Home Depot Pro', priceFactor: 0.94, baseLeadDays: 1 },
  { id: 'abq-builders', name: 'ABQ Builders Supply', priceFactor: 0.86, baseLeadDays: 2 },
  { id: 'western', name: 'Western Building Supply', priceFactor: 0.89, baseLeadDays: 3 },
  { id: 'lowes-pro', name: "Lowe's Pro Desk", priceFactor: 0.95, baseLeadDays: 1 },
  { id: 'sunbelt', name: 'Sunbelt Trade Distributors', priceFactor: 0.83, baseLeadDays: 5 },
];
