// Mock "live" material pricing engine. Given the material line items from an
// estimate, it matches each against the Albuquerque catalog and simulates a
// multi-supplier price comparison — the demo's stand-in for real supplier APIs.
import { Estimate, MaterialQuote, PricingResult, SupplierPrice } from './schemas';
import { SUPPLIERS } from './mock/suppliers';
import { lookupRetail } from './mock/catalog';

// Deterministic pseudo-random in [0,1) from a string seed, so the same estimate
// always prices identically (important for a repeatable demo).
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function priceEstimate(estimate: Estimate): PricingResult {
  const materialLines = estimate.lineItems.filter(
    (li) => li.category === 'materials' || li.category === 'equipment'
  );

  const quotes: MaterialQuote[] = materialLines.map((li) => {
    const { retailUnit } = lookupRetail(li.description, li.unitCost);

    const suppliers: SupplierPrice[] = SUPPLIERS.map((s) => {
      // Each supplier's price = retail * factor, nudged by a deterministic jitter.
      const jitter = 0.96 + seeded(li.description + s.id) * 0.1; // 0.96–1.06
      const price = round2(retailUnit * s.priceFactor * jitter);
      const availRoll = seeded(s.id + li.description + 'a');
      const availability: SupplierPrice['availability'] =
        availRoll > 0.85 ? 'Special order' : availRoll > 0.6 ? 'Limited' : 'In stock';
      const leadDays = s.baseLeadDays + (availability === 'Special order' ? 7 : availability === 'Limited' ? 2 : 0);
      return { supplier: s.name, price, availability, leadDays };
    });

    const best = suppliers.reduce((a, b) => (b.price < a.price ? b : a));
    const bestTotal = round2(best.price * li.quantity);
    const retailTotal = round2(retailUnit * li.quantity);

    return {
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      retailUnit,
      suppliers,
      bestSupplier: best.supplier,
      bestUnit: best.price,
      bestTotal,
      savings: round2(retailTotal - bestTotal),
    };
  });

  const retailTotal = round2(quotes.reduce((s, q) => s + q.retailUnit * q.quantity, 0));
  const bestTotal = round2(quotes.reduce((s, q) => s + q.bestTotal, 0));

  return {
    quotes,
    retailTotal,
    bestTotal,
    totalSavings: round2(retailTotal - bestTotal),
  };
}
