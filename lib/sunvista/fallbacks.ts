// Deterministic fixtures so the demo always works — even with no OPENAI_API_KEY
// or a flaky network. Each AI route falls back to these.
import {
  ParsedIntake,
  Estimate,
  EstimateLineItem,
  SitePlanSpec,
  Trade,
  IntakeEmail,
} from './schemas';

const INTAKE_FIXTURES: Record<string, ParsedIntake> = {
  'eml-001': {
    propertyAddress: '2240 Q St NE, Suite 120, Albuquerque, NM',
    propertyType: 'Retail strip center (shell)',
    scopeSummary:
      'Full tenant improvement of a 2,400 sq ft vacant retail shell for a coffee & bakery concept, including restrooms, kitchen rough-ins, new power, HVAC, finishes, and signage.',
    trades: ['general', 'plumbing', 'electrical', 'hvac', 'flooring', 'signage'],
    urgency: 'high',
    requestedBy: 'Teresa Martinez',
    contactEmail: 'tmartinez@desertridgeretail.com',
    contactPhone: '(505) 555-0142',
    budgetSignal: 'Tenant wants to open mid-September — tight timeline; TI allowance being finalized.',
    squareFeet: 2400,
    suggestedAction: 'Produce a TI budget for the lease allowance and schedule a site walk this week.',
    keyRequirements: [
      'Two ADA restrooms',
      'Plumbing rough-in for 3-comp sink, hand sinks, water heater',
      'New 200A panel and lighting',
      'Add 5-ton rooftop unit with ductwork',
      'Frame ~400 sq ft back-of-house prep area',
      'Epoxy + LVT flooring, storefront signage',
    ],
  },
  'eml-002': {
    propertyAddress: '8500 Jefferson St NE, Building C, Albuquerque, NM',
    propertyType: 'Class B office',
    scopeSummary:
      'Emergency replacement of a failed 19-year-old rooftop unit serving an entire 3rd floor — comparable 7.5-ton RTU, crane set, electrical reconnect, and disposal of the old unit.',
    trades: ['hvac', 'electrical'],
    urgency: 'emergency',
    requestedBy: 'Greg Whitlock',
    contactEmail: 'facilities@sandiaofficepark.com',
    contactPhone: '(505) 555-0188',
    budgetSignal: 'Tenants affected, 84°F and rising — needs same-day emergency response.',
    squareFeet: 0,
    suggestedAction: 'Dispatch crew, source a 7.5-ton RTU today, and provide an emergency replacement number.',
    keyRequirements: [
      'Remove and dispose of failed 7.5-ton RTU',
      'Source comparable 7.5-ton replacement unit',
      'Crane set new unit',
      'Electrical reconnect and startup',
      'Restore cooling to 3rd floor today',
    ],
  },
  'eml-003': {
    propertyAddress: '6100 Coors Blvd NW, Albuquerque, NM',
    propertyType: 'Retail plaza',
    scopeSummary:
      'Parking lot rehabilitation for a ~42,000 sq ft lot: crack seal, 2" mill and overlay, ADA-compliant restriping, wheel stops, fire-lane curbs, landscape island refresh, and two new LED pole lights.',
    trades: ['concrete', 'painting', 'landscaping', 'electrical'],
    urgency: 'low',
    requestedBy: 'Daniel Reyes',
    contactEmail: 'owner@mesaverdeplaza.net',
    contactPhone: '(505) 555-0210',
    budgetSignal: 'No rush — wants completion before fall.',
    squareFeet: 42000,
    suggestedAction: 'Prepare a written estimate and schedule a lot assessment for ADA count compliance.',
    keyRequirements: [
      'Crack seal + 2" mill and overlay (~42,000 sq ft)',
      'ADA-compliant restripe and accessible signage',
      'Replace ~6 wheel stops, repaint fire lanes',
      'Landscape island xeriscape refresh + drip repair',
      'Two new LED parking lot pole lights',
    ],
  },
  'eml-004': {
    propertyAddress: '3424 Central Ave SE, Suite 200, Albuquerque, NM',
    propertyType: 'Medical/dental office',
    scopeSummary:
      'Expansion of a dental practice into an adjacent 600 sq ft suite — two new operatories and a sterilization room with specialized plumbing, vacuum/air, electrical, and casework, plus a shared-wall reconfiguration.',
    trades: ['general', 'plumbing', 'electrical', 'hvac', 'flooring'],
    urgency: 'medium',
    requestedBy: 'Dr. Linda Wong',
    contactEmail: 'lwong@nobhilldental.com',
    contactPhone: '(505) 555-0177',
    budgetSignal: 'Target ~8 weeks; work limited to Fridays/weekends due to patient hours.',
    squareFeet: 600,
    suggestedAction: 'Scope the operatory rough-ins and price a phased, after-hours schedule.',
    keyRequirements: [
      'Two new dental operatories',
      'Sterilization room with autoclave + stainless counters',
      'Vacuum, compressed air, and dedicated electrical per chair',
      'Reconfigure shared wall, add door from reception',
      'After-hours / weekend phasing',
    ],
  },
};

export function fallbackIntake(email: IntakeEmail): ParsedIntake {
  return (
    INTAKE_FIXTURES[email.id] || {
      propertyAddress: email.property || 'Albuquerque, NM',
      propertyType: 'Commercial',
      scopeSummary: email.subject,
      trades: ['general'],
      urgency: 'medium',
      requestedBy: email.fromName,
      contactEmail: email.from,
      contactPhone: '',
      budgetSignal: '',
      squareFeet: 0,
      suggestedAction: 'Schedule a site walk and prepare a preliminary estimate.',
      keyRequirements: [email.subject],
    }
  );
}

// Per-trade line item templates used to assemble a plausible fallback estimate.
const TRADE_LINES: Record<Trade, (sf: number) => Omit<EstimateLineItem, 'total'>[]> = {
  general: (sf) => [
    { category: 'labor', trade: 'general', description: 'Demolition & site prep', quantity: Math.max(40, sf * 0.02), unit: 'hr', unitCost: 68 },
    { category: 'materials', trade: 'general', description: 'Metal stud framing & track', quantity: Math.max(200, sf * 0.6), unit: 'lf', unitCost: 4.2 },
    { category: 'materials', trade: 'general', description: 'Drywall, tape & finish', quantity: Math.max(60, sf * 0.4), unit: 'sheet', unitCost: 16 },
    { category: 'labor', trade: 'general', description: 'General supervision & cleanup', quantity: Math.max(60, sf * 0.03), unit: 'hr', unitCost: 75 },
  ],
  hvac: () => [
    { category: 'equipment', trade: 'hvac', description: 'Packaged rooftop unit (5-ton)', quantity: 1, unit: 'ea', unitCost: 8200 },
    { category: 'materials', trade: 'hvac', description: 'Ductwork & distribution', quantity: 180, unit: 'lf', unitCost: 14 },
    { category: 'labor', trade: 'hvac', description: 'Set, connect & commission', quantity: 32, unit: 'hr', unitCost: 95 },
    { category: 'equipment', trade: 'hvac', description: 'Crane set', quantity: 1, unit: 'ls', unitCost: 1800 },
  ],
  electrical: (sf) => [
    { category: 'materials', trade: 'electrical', description: '200A panel & feeders', quantity: 1, unit: 'ea', unitCost: 1150 },
    { category: 'materials', trade: 'electrical', description: 'LED light fixtures', quantity: Math.max(8, Math.round(sf / 120)), unit: 'ea', unitCost: 78 },
    { category: 'labor', trade: 'electrical', description: 'Rough-in & trim', quantity: Math.max(40, sf * 0.04), unit: 'hr', unitCost: 88 },
  ],
  plumbing: () => [
    { category: 'materials', trade: 'plumbing', description: 'Fixtures (WC, lavs, water heater)', quantity: 4, unit: 'ea', unitCost: 420 },
    { category: 'materials', trade: 'plumbing', description: 'Supply & waste rough-in', quantity: 220, unit: 'lf', unitCost: 6.5 },
    { category: 'labor', trade: 'plumbing', description: 'Rough & set', quantity: 48, unit: 'hr', unitCost: 92 },
  ],
  landscaping: (sf) => [
    { category: 'materials', trade: 'landscaping', description: 'Xeriscape gravel & rock', quantity: Math.max(400, sf * 0.05), unit: 'sf', unitCost: 1.85 },
    { category: 'materials', trade: 'landscaping', description: 'Shrubs & plantings', quantity: 24, unit: 'ea', unitCost: 22 },
    { category: 'labor', trade: 'landscaping', description: 'Install & drip repair', quantity: 36, unit: 'hr', unitCost: 58 },
  ],
  signage: () => [
    { category: 'subcontractor', trade: 'signage', description: 'Storefront channel-letter signage', quantity: 1, unit: 'ea', unitCost: 2600 },
    { category: 'labor', trade: 'signage', description: 'Permitting & install', quantity: 12, unit: 'hr', unitCost: 70 },
  ],
  concrete: (sf) => [
    { category: 'subcontractor', trade: 'concrete', description: '2" mill & asphalt overlay', quantity: Math.max(2000, sf), unit: 'sf', unitCost: 2.35 },
    { category: 'materials', trade: 'concrete', description: 'Crack seal', quantity: Math.max(2000, sf), unit: 'sf', unitCost: 0.42 },
    { category: 'labor', trade: 'concrete', description: 'Wheel stops & curb work', quantity: 24, unit: 'hr', unitCost: 62 },
  ],
  roofing: (sf) => [
    { category: 'subcontractor', trade: 'roofing', description: 'TPO membrane roofing', quantity: Math.max(1000, sf), unit: 'sf', unitCost: 6.8 },
    { category: 'labor', trade: 'roofing', description: 'Tear-off & install', quantity: 60, unit: 'hr', unitCost: 64 },
  ],
  painting: (sf) => [
    { category: 'materials', trade: 'painting', description: 'Paint & primer', quantity: Math.max(10, Math.round(sf / 350)), unit: 'gal', unitCost: 42 },
    { category: 'labor', trade: 'painting', description: 'Prep & application', quantity: Math.max(24, sf * 0.02), unit: 'hr', unitCost: 52 },
  ],
  flooring: (sf) => [
    { category: 'materials', trade: 'flooring', description: 'LVT flooring', quantity: Math.max(400, sf * 0.6), unit: 'sf', unitCost: 3.9 },
    { category: 'materials', trade: 'flooring', description: 'Epoxy service-area coating', quantity: Math.max(200, sf * 0.3), unit: 'sf', unitCost: 4.75 },
    { category: 'labor', trade: 'flooring', description: 'Surface prep & install', quantity: Math.max(32, sf * 0.03), unit: 'hr', unitCost: 56 },
  ],
};

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function fallbackEstimate(intake: ParsedIntake): Estimate {
  const sf = intake.squareFeet || 1500;
  const trades = intake.trades.length ? intake.trades : ['general' as Trade];

  const lineItems: EstimateLineItem[] = [];
  for (const trade of trades) {
    const builder = TRADE_LINES[trade];
    if (!builder) continue;
    for (const partial of builder(sf)) {
      const quantity = round(partial.quantity);
      lineItems.push({ ...partial, quantity, total: round(quantity * partial.unitCost) });
    }
  }
  lineItems.push({ category: 'permits', trade: 'general', description: 'Permits & inspections', quantity: 1, unit: 'ls', unitCost: 1850, total: 1850 });

  const subtotal = round(lineItems.reduce((s, li) => s + li.total, 0));
  const overheadPct = 10;
  const contingencyPct = 7;
  const marginPct = 15;
  const grown = subtotal * (1 + overheadPct / 100) * (1 + contingencyPct / 100) * (1 + marginPct / 100);
  const bidTotal = Math.round(grown / 50) * 50;

  return {
    lineItems,
    subtotal,
    overheadPct,
    contingencyPct,
    marginPct,
    bidTotal,
    durationDays: Math.max(7, Math.round(sf / 120) + trades.length * 3),
    assumptions: [
      'Pricing based on current Albuquerque commercial market rates.',
      'Normal business-hours access unless otherwise noted.',
      'No hazardous-material abatement included.',
      'Final pricing subject to site walk and approved drawings.',
    ],
    confidence: 0.74,
  };
}

export function fallbackPlan(intake: ParsedIntake): SitePlanSpec {
  const isSite = intake.trades.includes('concrete') || intake.trades.includes('landscaping');
  if (isSite) {
    return {
      title: 'Site Improvement Plan',
      address: intake.propertyAddress,
      scale: '1" = 30\'-0"',
      width: 120,
      height: 80,
      zones: [
        { id: 'z1', label: 'Main Parking Lot — Mill & Overlay', x: 8, y: 10, w: 80, h: 44, type: 'work' },
        { id: 'z2', label: 'ADA Stalls', x: 8, y: 10, w: 22, h: 14, type: 'room' },
        { id: 'z3', label: 'Landscape Island', x: 40, y: 24, w: 14, h: 10, type: 'outdoor' },
        { id: 'z4', label: 'Landscape Island', x: 62, y: 24, w: 14, h: 10, type: 'outdoor' },
        { id: 'z5', label: 'Building (Existing)', x: 8, y: 60, w: 104, h: 14, type: 'existing' },
        { id: 'z6', label: 'Fire Lane', x: 92, y: 10, w: 20, h: 44, type: 'work' },
      ],
      walls: [{ x1: 8, y1: 10, x2: 112, y2: 10 }, { x1: 8, y1: 10, x2: 8, y2: 54 }, { x1: 112, y1: 10, x2: 112, y2: 54 }],
      dimensions: [
        { x1: 8, y1: 6, x2: 88, y2: 6, label: "240'-0\"" },
        { x1: 4, y1: 10, x2: 4, y2: 54, label: "132'-0\"" },
      ],
      annotations: [
        { x: 30, y: 34, text: '2" mill & overlay, crack seal' },
        { x: 12, y: 18, text: 'New ADA-compliant stalls + signage' },
        { x: 96, y: 32, text: 'Repaint fire lane' },
      ],
      legend: [
        { label: 'Scope of Work', color: '#b45309' },
        { label: 'New / Restriped', color: '#1e3a5f' },
        { label: 'Existing to Remain', color: '#374151' },
        { label: 'Landscape', color: '#14532d' },
      ],
    };
  }
  return {
    title: 'Tenant Improvement Floor Plan',
    address: intake.propertyAddress,
    scale: '1/8" = 1\'-0"',
    width: 60,
    height: 40,
    zones: [
      { id: 'z1', label: 'Seating / Front of House', x: 2, y: 2, w: 34, h: 24, type: 'room' },
      { id: 'z2', label: 'Back of House / Prep', x: 38, y: 2, w: 20, h: 16, type: 'work' },
      { id: 'z3', label: 'Restroom A', x: 38, y: 20, w: 9, h: 8, type: 'room' },
      { id: 'z4', label: 'Restroom B', x: 49, y: 20, w: 9, h: 8, type: 'room' },
      { id: 'z5', label: 'Service Counter', x: 2, y: 28, w: 34, h: 10, type: 'work' },
      { id: 'z6', label: 'Mechanical', x: 38, y: 30, w: 20, h: 8, type: 'existing' },
    ],
    walls: [
      { x1: 2, y1: 2, x2: 58, y2: 2 },
      { x1: 58, y1: 2, x2: 58, y2: 38 },
      { x1: 58, y1: 38, x2: 2, y2: 38 },
      { x1: 2, y1: 38, x2: 2, y2: 2 },
      { x1: 38, y1: 2, x2: 38, y2: 38 },
    ],
    dimensions: [
      { x1: 2, y1: -1, x2: 58, y2: -1, label: "56'-0\"" },
      { x1: -1, y1: 2, x2: -1, y2: 38, label: "36'-0\"" },
    ],
    annotations: [
      { x: 40, y: 10, text: 'New plumbing rough-in' },
      { x: 4, y: 33, text: 'Electrical: new 200A panel' },
      { x: 39, y: 24, text: 'ADA restrooms' },
    ],
    legend: [
      { label: 'New Construction', color: '#b45309' },
      { label: 'Finished Room', color: '#1e3a5f' },
      { label: 'Existing to Remain', color: '#374151' },
    ],
  };
}
