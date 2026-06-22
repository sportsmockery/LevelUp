// SunVista BuildAI — shared types for the GC automation demo.
// These describe the data that flows intake -> estimate -> pricing -> design -> tracking.

export type Trade =
  | 'general'
  | 'hvac'
  | 'electrical'
  | 'plumbing'
  | 'landscaping'
  | 'signage'
  | 'concrete'
  | 'roofing'
  | 'painting'
  | 'flooring';

export type Urgency = 'low' | 'medium' | 'high' | 'emergency';

export type JobStage =
  | 'intake'
  | 'estimated'
  | 'bid_sent'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'complete'
  | 'invoiced';

export const JOB_STAGES: { key: JobStage; label: string }[] = [
  { key: 'intake', label: 'Intake' },
  { key: 'estimated', label: 'Estimated' },
  { key: 'bid_sent', label: 'Bid Sent' },
  { key: 'approved', label: 'Approved' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
  { key: 'invoiced', label: 'Invoiced' },
];

export const TRADE_LABELS: Record<Trade, string> = {
  general: 'General',
  hvac: 'HVAC',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  landscaping: 'Landscaping',
  signage: 'Signage',
  concrete: 'Concrete',
  roofing: 'Roofing',
  painting: 'Painting',
  flooring: 'Flooring',
};

export interface IntakeEmail {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  receivedAt: string;
  body: string;
  property?: string;
}

export interface ParsedIntake {
  propertyAddress: string;
  propertyType: string;
  scopeSummary: string;
  trades: Trade[];
  urgency: Urgency;
  requestedBy: string;
  contactEmail: string;
  contactPhone?: string;
  budgetSignal?: string;
  squareFeet?: number;
  suggestedAction: string;
  keyRequirements: string[];
}

export interface EstimateLineItem {
  category: 'labor' | 'materials' | 'equipment' | 'permits' | 'subcontractor';
  trade: Trade;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
}

export interface Estimate {
  lineItems: EstimateLineItem[];
  subtotal: number;
  overheadPct: number;
  marginPct: number;
  contingencyPct: number;
  bidTotal: number;
  durationDays: number;
  assumptions: string[];
  confidence: number;
}

export interface SupplierPrice {
  supplier: string;
  price: number;
  availability: 'In stock' | 'Limited' | 'Special order';
  leadDays: number;
}

export interface MaterialQuote {
  description: string;
  quantity: number;
  unit: string;
  retailUnit: number;
  suppliers: SupplierPrice[];
  bestSupplier: string;
  bestUnit: number;
  bestTotal: number;
  savings: number;
}

export interface PricingResult {
  quotes: MaterialQuote[];
  retailTotal: number;
  bestTotal: number;
  totalSavings: number;
}

export type ZoneType = 'room' | 'work' | 'existing' | 'demo' | 'outdoor';

export interface PlanZone {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: ZoneType;
}

export interface PlanWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PlanDimension {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}

export interface PlanAnnotation {
  x: number;
  y: number;
  text: string;
}

export interface SitePlanSpec {
  title: string;
  address: string;
  scale: string;
  width: number; // drawing width in feet
  height: number; // drawing height in feet
  zones: PlanZone[];
  walls: PlanWall[];
  dimensions: PlanDimension[];
  annotations: PlanAnnotation[];
  legend: { label: string; color: string }[];
}

export interface Job {
  id: string;
  jobNumber: string;
  title: string;
  property: string;
  trades: Trade[];
  urgency: Urgency;
  stage: JobStage;
  createdAt: string;
  sourceEmailId?: string;
  intake?: ParsedIntake;
  estimate?: Estimate;
  pricing?: PricingResult;
  plan?: SitePlanSpec;
  bidTotal?: number;
}

export const ZONE_COLORS: Record<ZoneType, string> = {
  room: '#1e3a5f',
  work: '#b45309',
  existing: '#374151',
  demo: '#7f1d1d',
  outdoor: '#14532d',
};
