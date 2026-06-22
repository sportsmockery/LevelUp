// Seeded Albuquerque material catalog. The pricing engine matches estimate
// material line items against these keyword entries to pull a realistic retail
// unit price; unmatched items fall back to the estimate's own unit cost.
export interface CatalogItem {
  keywords: string[];
  retailUnit: number;
  unit: string;
}

export const CATALOG: CatalogItem[] = [
  { keywords: ['rooftop', 'rtu', 'package unit', 'ac unit', 'condenser'], retailUnit: 8200, unit: 'ea' },
  { keywords: ['ductwork', 'duct', 'sheet metal'], retailUnit: 14, unit: 'lf' },
  { keywords: ['200a panel', 'electrical panel', 'panelboard', 'load center'], retailUnit: 1150, unit: 'ea' },
  { keywords: ['wire', 'romex', 'thhn', 'conductor'], retailUnit: 0.85, unit: 'lf' },
  { keywords: ['led', 'light fixture', 'troffer', 'recessed'], retailUnit: 78, unit: 'ea' },
  { keywords: ['pole light', 'parking lot light', 'area light'], retailUnit: 940, unit: 'ea' },
  { keywords: ['toilet', 'water closet', 'commode'], retailUnit: 320, unit: 'ea' },
  { keywords: ['sink', 'lavatory', 'basin'], retailUnit: 240, unit: 'ea' },
  { keywords: ['water heater'], retailUnit: 1450, unit: 'ea' },
  { keywords: ['pvc', 'pipe', 'copper', 'pex', 'plumbing rough'], retailUnit: 6.5, unit: 'lf' },
  { keywords: ['metal stud', 'framing', 'stud', 'track'], retailUnit: 4.2, unit: 'lf' },
  { keywords: ['drywall', 'gypsum', 'sheetrock'], retailUnit: 16, unit: 'sheet' },
  { keywords: ['epoxy', 'floor coating'], retailUnit: 4.75, unit: 'sf' },
  { keywords: ['lvt', 'luxury vinyl', 'vinyl plank'], retailUnit: 3.9, unit: 'sf' },
  { keywords: ['tile', 'ceramic', 'porcelain'], retailUnit: 5.5, unit: 'sf' },
  { keywords: ['paint', 'primer', 'coating'], retailUnit: 42, unit: 'gal' },
  { keywords: ['asphalt', 'overlay', 'paving', 'mill'], retailUnit: 2.35, unit: 'sf' },
  { keywords: ['crack seal', 'sealcoat'], retailUnit: 0.42, unit: 'sf' },
  { keywords: ['striping', 'stripe', 'paint marking'], retailUnit: 4.8, unit: 'stall' },
  { keywords: ['wheel stop', 'parking block'], retailUnit: 38, unit: 'ea' },
  { keywords: ['gravel', 'xeriscape', 'landscape rock'], retailUnit: 1.85, unit: 'sf' },
  { keywords: ['shrub', 'plant', 'planting'], retailUnit: 22, unit: 'ea' },
  { keywords: ['drip', 'irrigation'], retailUnit: 1.4, unit: 'lf' },
  { keywords: ['cabinet', 'casework', 'millwork'], retailUnit: 285, unit: 'lf' },
  { keywords: ['counter', 'stainless', 'countertop'], retailUnit: 95, unit: 'sf' },
  { keywords: ['door', 'frame', 'hardware'], retailUnit: 540, unit: 'ea' },
  { keywords: ['sign', 'channel letter', 'storefront signage', 'monument'], retailUnit: 2600, unit: 'ea' },
  { keywords: ['autoclave', 'sterilizer'], retailUnit: 4800, unit: 'ea' },
  { keywords: ['vacuum', 'compressed air', 'dental utility'], retailUnit: 3200, unit: 'ea' },
];

export function lookupRetail(description: string, fallbackUnit: number): { retailUnit: number } {
  const text = description.toLowerCase();
  for (const item of CATALOG) {
    if (item.keywords.some((k) => text.includes(k))) {
      return { retailUnit: item.retailUnit };
    }
  }
  // Unmatched material — treat the estimate's unit cost as retail baseline.
  return { retailUnit: fallbackUnit > 0 ? fallbackUnit : 25 };
}
