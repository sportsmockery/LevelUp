'use client';

import { useMemo, useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Gauge,
  Brain,
  TrendingDown,
  Flame,
  Fuel,
  CircleDollarSign,
  Wrench,
  Languages,
  MessageCircle,
  X,
  ChevronRight,
  Star,
  CheckCircle2,
  Activity,
  Lock,
  Phone,
  CalendarCheck,
  BadgeCheck,
  Mic,
  Send,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   INVENTORY (real lot data)
   ───────────────────────────────────────────────────────────────────────── */

type Car = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  miles: number;
  exterior: string;
  interior: string;
  engine: string;
  fuel: 'Gasoline' | 'Diesel';
  drivetrain: string;
  riskScore: number;          // mechanical risk: 0-100 (higher = safer)
  smartBuy: boolean;
  fiveYearCost: number;       // total cost of ownership estimate
  monthlyInsurance: number;   // est
  monthlyFuel: number;        // est
  aiAnalysis: string;
  heroGradient: string;       // tailwind gradient classes for card glow
  accent: string;             // neon accent color
  image: string;              // background "silhouette" hint via gradient
};

const INVENTORY: Car[] = [
  {
    id: 'bmw-530i-2019',
    year: 2019,
    make: 'BMW',
    model: '5 Series',
    trim: '530i',
    price: 17246,
    miles: 93976,
    exterior: 'Silver',
    interior: 'Black',
    engine: '2.0L Turbo I4',
    fuel: 'Gasoline',
    drivetrain: 'RWD',
    riskScore: 92,
    smartBuy: true,
    fiveYearCost: 24800,
    monthlyInsurance: 142,
    monthlyFuel: 198,
    aiAnalysis:
      'Single-owner California-to-Indiana relocation. Full BMW dealer service history through 80k. Zero rust, garage-kept. We acquired this 31% under MMR — the kind of executive sedan that punches three classes above its price.',
    heroGradient: 'from-cyan-500/30 via-sky-500/10 to-transparent',
    accent: 'cyan',
    image: 'linear-gradient(135deg, #cbd5e1 0%, #64748b 50%, #1e293b 100%)',
  },
  {
    id: 'silverado-2016',
    year: 2016,
    make: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'LT 4x4',
    price: 17246,
    miles: 131542,
    exterior: 'Burgundy',
    interior: 'Charcoal',
    engine: '5.3L V8',
    fuel: 'Gasoline',
    drivetrain: '4x4',
    riskScore: 88,
    smartBuy: true,
    fiveYearCost: 27400,
    monthlyInsurance: 128,
    monthlyFuel: 312,
    aiAnalysis:
      'Workhorse from a regional contractor. 5.3 V8 with the AFM lifter delete already performed at 95k — the single biggest risk on this platform is gone. Clean frame, undercoated annually. Pulls 9,400 lb.',
    heroGradient: 'from-rose-500/30 via-red-500/10 to-transparent',
    accent: 'rose',
    image: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 60%, #1e1b1b 100%)',
  },
  {
    id: 'rav4-2016',
    year: 2016,
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE AWD',
    price: 15246,
    miles: 137258,
    exterior: 'Charcoal',
    interior: 'Gray',
    engine: '2.5L I4',
    fuel: 'Gasoline',
    drivetrain: 'AWD',
    riskScore: 95,
    smartBuy: true,
    fiveYearCost: 19200,
    monthlyInsurance: 118,
    monthlyFuel: 184,
    aiAnalysis:
      'The car we recommend to anyone with a teenager or a 90-mile commute. Original drivetrain, no transmission concerns on the 6-speed auto. Every Toyota tech we partner with says the same thing: drive it to 250k.',
    heroGradient: 'from-violet-500/30 via-purple-500/10 to-transparent',
    accent: 'violet',
    image: 'linear-gradient(135deg, #475569 0%, #334155 50%, #0f172a 100%)',
  },
  {
    id: 'f350-2008',
    year: 2008,
    make: 'Ford',
    model: 'F-350 Super Duty',
    trim: 'Lariat 4WD',
    price: 18246,
    miles: 141031,
    exterior: 'Dark Blue Pearl',
    interior: 'Tan Leather',
    engine: '6.4L Power Stroke V8',
    fuel: 'Diesel',
    drivetrain: '4WD',
    riskScore: 78,
    smartBuy: false,
    fiveYearCost: 32100,
    monthlyInsurance: 162,
    monthlyFuel: 408,
    aiAnalysis:
      'The 6.4 Power Stroke gets a bad rap — this one has the EGR cooler delete and updated radiator already done. We bought it because the work is already in the truck. Lariat leather is in 8/10 condition. Honest farm truck.',
    heroGradient: 'from-amber-500/30 via-orange-500/10 to-transparent',
    accent: 'amber',
    image: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 60%, #0f172a 100%)',
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────────────────── */

function approvalPctFor(car: Car, down: number) {
  // Heuristic for mockup: ratio of down payment to price + risk bonus
  const ratio = down / car.price;
  let base = 42 + ratio * 110;
  // Higher risk score (cleaner cars) get a slight underwriting bump
  base += (car.riskScore - 80) * 0.6;
  // Diesel and heavy trucks get harder approvals (lender risk)
  if (car.fuel === 'Diesel') base -= 6;
  if (car.miles > 130000) base -= 4;
  return Math.max(38, Math.min(99, Math.round(base)));
}

function approvalTier(pct: number) {
  if (pct >= 88) return { label: 'INSTANT APPROVAL', tone: 'emerald' };
  if (pct >= 72) return { label: 'PRE-QUALIFIED', tone: 'cyan' };
  if (pct >= 58) return { label: 'LIKELY APPROVED', tone: 'violet' };
  return { label: 'NEEDS CO-SIGNER', tone: 'amber' };
}

const fmt = (n: number) => '$' + n.toLocaleString('en-US');

const accentText: Record<string, string> = {
  cyan: 'text-cyan-300',
  rose: 'text-rose-300',
  violet: 'text-violet-300',
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
};
const accentDot: Record<string, string> = {
  cyan: 'bg-cyan-400',
  rose: 'bg-rose-400',
  violet: 'bg-violet-400',
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-400',
};
const accentGlow: Record<string, string> = {
  cyan: 'shadow-[0_0_60px_-15px_rgba(34,211,238,0.55)]',
  rose: 'shadow-[0_0_60px_-15px_rgba(244,63,94,0.55)]',
  violet: 'shadow-[0_0_60px_-15px_rgba(139,92,246,0.55)]',
  amber: 'shadow-[0_0_60px_-15px_rgba(245,158,11,0.55)]',
  emerald: 'shadow-[0_0_60px_-15px_rgba(16,185,129,0.55)]',
};

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────────────────── */

export default function TripleMPage() {
  const [downPayment, setDownPayment] = useState(2500);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachLang, setCoachLang] = useState<'en' | 'es'>('en');

  const inventoryWithApproval = useMemo(
    () =>
      INVENTORY.map((c) => ({
        ...c,
        approval: approvalPctFor(c, downPayment),
      })),
    [downPayment]
  );

  // Show all cars, but sort by approval likelihood so the highest-likelihood
  // vehicles drift to the front as the user moves the slider.
  const sortedCars = useMemo(
    () => [...inventoryWithApproval].sort((a, b) => b.approval - a.approval),
    [inventoryWithApproval]
  );

  const selectedCar = selectedId ? inventoryWithApproval.find((c) => c.id === selectedId) ?? null : null;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 antialiased">
      {/* Atmospheric background */}
      <BackgroundFX />

      {/* NAV */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/30 to-violet-500/30 ring-1 ring-white/10 backdrop-blur-xl">
            <span className="text-lg font-black tracking-tight">M³</span>
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Triple M Motors</p>
            <p className="text-sm font-semibold text-white">Saint John, IN · Powered by CarIQ</p>
          </div>
        </div>
        <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          <a className="hover:text-white">Inventory</a>
          <a className="hover:text-white">Financing</a>
          <a className="hover:text-white">CarIQ</a>
          <a className="hover:text-white">Confidence Program</a>
        </nav>
        <button className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/10">
          (219) 555-0199
        </button>
      </header>

      {/* HERO */}
      <Hero downPayment={downPayment} setDownPayment={setDownPayment} cars={sortedCars} />

      {/* INVENTORY GRID */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">Live Inventory · CarIQ Verified</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Cars sorted by <span className="text-cyan-300">your</span> approval likelihood
            </h2>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
            <Activity className="h-3.5 w-3.5 text-emerald-400" /> Re-scoring in real time
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {sortedCars.map((car, i) => (
            <VehicleCard key={car.id} car={car} index={i} onClick={() => setSelectedId(car.id)} />
          ))}
        </div>
      </section>

      {/* CONFIDENCE PROGRAM */}
      <ConfidenceProgram />

      {/* WHY CarIQ STRIP */}
      <WhyStrip />

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 bg-black/40 px-6 py-12 backdrop-blur-xl lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/30 to-violet-500/30 ring-1 ring-white/10">
              <span className="text-lg font-black">M³</span>
            </div>
            <div className="text-sm leading-tight">
              <p className="font-semibold text-white">Triple M Motors</p>
              <p className="text-slate-400">9501 Wicker Ave · Saint John, IN 46373</p>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            CarIQ™ is a financing intelligence layer. Approval estimates are not commitments to lend.
          </div>
        </div>
      </footer>

      {/* VEHICLE DETAIL MODAL */}
      {selectedCar && <VehicleDetailModal car={selectedCar} onClose={() => setSelectedId(null)} />}

      {/* FLOATING CAR COACH */}
      <CarCoach open={coachOpen} setOpen={setCoachOpen} lang={coachLang} setLang={setCoachLang} car={selectedCar} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────────────────────────────────── */

function Hero({
  downPayment,
  setDownPayment,
  cars,
}: {
  downPayment: number;
  setDownPayment: (n: number) => void;
  cars: (Car & { approval: number })[];
}) {
  const avgApproval = Math.round(cars.reduce((s, c) => s + c.approval, 0) / cars.length);

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-20 lg:px-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_1fr]">
        {/* LEFT */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5" />
            CarIQ · Approval-First Buying
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight text-white md:text-6xl lg:text-7xl">
            Don't shop by{' '}
            <span className="bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text text-transparent line-through decoration-rose-400/70 decoration-4">
              price
            </span>
            .
            <br />
            Shop by{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
              APPROVAL.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            5-minute approval on any vehicle in stock. Move the dial below and watch the lot
            <span className="text-white"> re-rank itself </span>
            to the cars you can actually drive home today.
          </p>

          {/* SLIDER CARD */}
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Down Payment Optimizer</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                  {fmt(downPayment)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Lot Approval Avg</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-emerald-300">{avgApproval}%</p>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={8000}
              step={250}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="mt-6 w-full accent-cyan-400"
            />
            <div className="mt-2 flex justify-between text-[11px] uppercase tracking-wider text-slate-500">
              <span>$0 down</span>
              <span>$2,500</span>
              <span>$5,000</span>
              <span>$8,000+</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Pill icon={<ShieldCheck className="h-4 w-4" />} label="Soft pull only" />
              <Pill icon={<Lock className="h-4 w-4" />} label="No SSN required" />
              <Pill icon={<CalendarCheck className="h-4 w-4" />} label="Drive home today" />
            </div>
          </div>
        </div>

        {/* RIGHT — floating cinematic car card preview */}
        <HeroSpotlight cars={cars} />
      </div>
    </section>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
      <span className="text-cyan-300">{icon}</span>
      {label}
    </div>
  );
}

function HeroSpotlight({ cars }: { cars: (Car & { approval: number })[] }) {
  const lead = cars[0];
  const tier = approvalTier(lead.approval);
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-10 rounded-[40px] bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-transparent blur-3xl" />
      <div
        className={`relative aspect-[5/6] rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl ${accentGlow[lead.accent]}`}
        style={{ perspective: '1200px' }}
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-400">
          <span>Top Match For You</span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </span>
        </div>

        <div
          className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl ring-1 ring-white/10 transition-transform duration-700 hover:scale-[1.02]"
          style={{
            background: lead.image,
            transform: 'rotateX(8deg) rotateY(-6deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur">
            {lead.year} · {lead.make}
          </div>
          {lead.smartBuy && (
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-950 shadow-lg">
              <Sparkles className="h-3 w-3" /> Smart Buy
            </div>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-2xl font-semibold tracking-tight text-white">
            {lead.year} {lead.make} {lead.model}
          </h3>
          <p className="text-sm text-slate-400">{lead.trim} · {lead.miles.toLocaleString()} mi · {lead.exterior}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Approval</p>
            <p className={`mt-1 text-2xl font-semibold ${accentText[tier.tone]}`}>{lead.approval}%</p>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${accentText[tier.tone]}`}>
              {tier.label}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Price</p>
            <p className="mt-1 text-2xl font-semibold text-white">{fmt(lead.price)}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">No haggle · CarIQ priced</p>
          </div>
        </div>

        <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:opacity-90">
          Get Approved in 5 Minutes <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   VEHICLE CARD (grid)
   ───────────────────────────────────────────────────────────────────────── */

function VehicleCard({
  car,
  index,
  onClick,
}: {
  car: Car & { approval: number };
  index: number;
  onClick: () => void;
}) {
  const tier = approvalTier(car.approval);
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06] ${accentGlow[car.accent]}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${car.heroGradient}`}
      />
      <div
        className="relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/10 transition-transform duration-700 group-hover:scale-[1.03]"
        style={{ background: car.image }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur">
          {car.drivetrain}
        </div>
        {car.smartBuy && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-950">
            <Sparkles className="h-2.5 w-2.5" /> Smart
          </div>
        )}
      </div>

      <div className="relative mt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-white">
            {car.year} {car.make} {car.model}
          </h3>
          <p className="text-base font-semibold tracking-tight text-white">{fmt(car.price)}</p>
        </div>
        <p className="text-xs text-slate-400">
          {car.trim} · {car.miles.toLocaleString()} mi
        </p>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-400">Risk Score</p>
          <div className="mt-1 flex items-center gap-2">
            <Gauge className={`h-3.5 w-3.5 ${accentText[car.accent]}`} />
            <span className="text-sm font-semibold text-white">{car.riskScore}/100</span>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-400">Approval</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${accentDot[tier.tone]}`} />
            <span className={`text-sm font-semibold ${accentText[tier.tone]}`}>{car.approval}%</span>
          </div>
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between text-xs text-slate-400">
        <span className={`font-semibold uppercase tracking-wider ${accentText[tier.tone]}`}>{tier.label}</span>
        <span className="flex items-center gap-1 text-slate-300 transition group-hover:text-white">
          CarIQ Detail <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   VEHICLE DETAIL MODAL (the "Bloomberg Terminal for used cars")
   ───────────────────────────────────────────────────────────────────────── */

function VehicleDetailModal({
  car,
  onClose,
}: {
  car: Car & { approval: number };
  onClose: () => void;
}) {
  const tier = approvalTier(car.approval);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
      <div className="min-h-full px-4 py-10 md:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/95 to-slate-950/95 shadow-2xl backdrop-blur-2xl">
          {/* Glow */}
          <div
            className={`pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br opacity-50 blur-3xl ${car.heroGradient}`}
          />

          <button
            onClick={onClose}
            className="absolute right-5 top-5 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-xl transition hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* HEADER */}
          <div className="relative px-8 pt-12 pb-6 md:px-12">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">CarIQ Vehicle Intelligence</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  {car.year} {car.make} {car.model}
                </h2>
                <p className="mt-1 text-slate-400">
                  {car.trim} · {car.exterior} on {car.interior} · {car.miles.toLocaleString()} miles
                </p>
              </div>
              <div className="flex items-center gap-3">
                {car.smartBuy && (
                  <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-950 shadow-[0_0_30px_-8px_rgba(34,211,238,0.65)]">
                    <Sparkles className="h-3.5 w-3.5" /> Smart Buy
                  </div>
                )}
                <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  <BadgeCheck className="mr-1 inline h-3.5 w-3.5" /> M³ Confidence
                </div>
              </div>
            </div>
          </div>

          {/* IMAGE / SPECS */}
          <div className="relative grid grid-cols-1 gap-6 px-8 pb-8 md:grid-cols-[1.3fr_1fr] md:px-12">
            <div
              className="relative aspect-[16/9] overflow-hidden rounded-2xl ring-1 ring-white/10"
              style={{ background: car.image }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Lot Photo · 4K Walkaround</p>
                  <p className="text-sm text-white">12 angles · Undercarriage · Engine bay</p>
                </div>
                <button className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur-xl hover:bg-white/10">
                  360° Tour
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SpecTile label="Engine" value={car.engine} />
              <SpecTile label="Drivetrain" value={car.drivetrain} />
              <SpecTile label="Fuel" value={car.fuel} />
              <SpecTile label="Miles" value={car.miles.toLocaleString()} />
              <SpecTile label="Exterior" value={car.exterior} />
              <SpecTile label="Interior" value={car.interior} />
              <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">CarIQ Price</p>
                <p className="mt-1 text-3xl font-semibold text-white">{fmt(car.price)}</p>
                <p className="text-[11px] text-slate-400">No-haggle. Priced from 14,000+ comparable Midwest listings.</p>
              </div>
            </div>
          </div>

          {/* MODULES */}
          <div className="relative grid grid-cols-1 gap-5 px-8 pb-8 md:grid-cols-3 md:px-12">
            <RiskGauge score={car.riskScore} accent={car.accent} />
            <ApprovalModule approval={car.approval} tier={tier} price={car.price} />
            <PredictiveCostModule car={car} />
          </div>

          {/* AI ANALYSIS */}
          <div className="relative px-8 pb-8 md:px-12">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/30 to-violet-500/30 ring-1 ring-white/10">
                  <Brain className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">Why we bought this vehicle</p>
                  <p className="text-sm text-slate-400">CarIQ AI Acquisition Memo · transparent reasoning</p>
                </div>
              </div>
              <p className="mt-4 text-lg leading-relaxed text-slate-200">{car.aiAnalysis}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Tag>Service records verified</Tag>
                <Tag>Frame inspected</Tag>
                <Tag>Below MMR</Tag>
                <Tag>Midwest-ready</Tag>
              </div>
            </div>
          </div>

          {/* CTA STRIP */}
          <div className="relative grid grid-cols-1 gap-3 border-t border-white/5 bg-black/30 px-8 py-6 md:grid-cols-3 md:px-12">
            <button className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-4 text-sm font-semibold text-slate-950 shadow-lg transition hover:opacity-90">
              <CheckCircle2 className="h-4 w-4" /> Get Approved Now · 5 min
            </button>
            <button className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/10">
              <CalendarCheck className="h-4 w-4" /> Schedule Test Drive
            </button>
            <button className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/10">
              <Phone className="h-4 w-4" /> Talk to a Human · (219) 555-0199
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wider text-slate-300">
      {children}
    </span>
  );
}

function SpecTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MODULES — Risk Gauge, Approval, Predictive Cost
   ───────────────────────────────────────────────────────────────────────── */

function RiskGauge({ score, accent }: { score: number; accent: string }) {
  // Build SVG arc for a gauge
  const radius = 70;
  const circumference = Math.PI * radius;
  const dash = (score / 100) * circumference;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Mechanical Risk Score</p>
        <Wrench className={`h-4 w-4 ${accentText[accent]}`} />
      </div>
      <div className="mt-4 flex flex-col items-center">
        <svg viewBox="0 0 180 110" className="w-full">
          <defs>
            <linearGradient id={`g-${accent}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path d="M20,100 A70,70 0 0,1 160,100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
          <path
            d="M20,100 A70,70 0 0,1 160,100"
            fill="none"
            stroke={`url(#g-${accent})`}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
          <text x="90" y="92" textAnchor="middle" fill="#fff" fontSize="32" fontWeight="700">
            {score}
          </text>
          <text x="90" y="106" textAnchor="middle" fill="#94a3b8" fontSize="10" letterSpacing="2">
            / 100
          </text>
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wider text-slate-400">
        <div>
          <p className="text-emerald-300">Drivetrain</p>
          <p>Pass</p>
        </div>
        <div>
          <p className="text-emerald-300">Frame</p>
          <p>Pass</p>
        </div>
        <div>
          <p className={score < 85 ? 'text-amber-300' : 'text-emerald-300'}>Wear Items</p>
          <p>{score < 85 ? 'Monitor' : 'Pass'}</p>
        </div>
      </div>
    </div>
  );
}

function ApprovalModule({
  approval,
  tier,
  price,
}: {
  approval: number;
  tier: { label: string; tone: string };
  price: number;
}) {
  const monthly = Math.round((price - 2000) / 60) + 35; // very rough mockup math
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Approval Forecast</p>
        <ShieldCheck className={`h-4 w-4 ${accentText[tier.tone]}`} />
      </div>
      <div className="mt-4">
        <p className={`text-5xl font-semibold ${accentText[tier.tone]}`}>{approval}%</p>
        <p className={`text-xs font-bold uppercase tracking-[0.2em] ${accentText[tier.tone]}`}>{tier.label}</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
          style={{ width: `${approval}%` }}
        />
      </div>
      <div className="mt-5 space-y-2 text-xs text-slate-300">
        <Row label="Est. Monthly" value={`$${monthly}/mo`} />
        <Row label="Lenders Matched" value="7 of 12" />
        <Row label="Term" value="60 months" />
        <Row label="Soft Pull" value="No credit impact" tone="emerald" />
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={tone === 'emerald' ? 'text-emerald-300' : 'font-semibold text-white'}>{value}</span>
    </div>
  );
}

function PredictiveCostModule({ car }: { car: Car }) {
  const yearly = Math.round(car.fiveYearCost / 5);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">5-Year Ownership Forecast</p>
        <TrendingDown className="h-4 w-4 text-cyan-300" />
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{fmt(car.fiveYearCost)}</p>
      <p className="text-xs text-slate-400">≈ {fmt(yearly)}/yr · all-in</p>
      <div className="mt-5 space-y-3">
        <BarRow icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="Insurance" value={`$${car.monthlyInsurance}/mo`} pct={Math.min(100, car.monthlyInsurance / 2)} />
        <BarRow icon={<Fuel className="h-3.5 w-3.5" />} label="Fuel" value={`$${car.monthlyFuel}/mo`} pct={Math.min(100, car.monthlyFuel / 5)} />
        <BarRow icon={<Wrench className="h-3.5 w-3.5" />} label="Maintenance" value="$84/mo" pct={42} />
        <BarRow icon={<Flame className="h-3.5 w-3.5" />} label="Depreciation" value="$112/mo" pct={56} />
      </div>
    </div>
  );
}

function BarRow({ icon, label, value, pct }: { icon: React.ReactNode; label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="text-cyan-300">{icon}</span>
          {label}
        </span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400/80 to-violet-500/80" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   CONFIDENCE PROGRAM
   ───────────────────────────────────────────────────────────────────────── */

function ConfidenceProgram() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-10">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 backdrop-blur-2xl md:p-12">
        <div className="pointer-events-none absolute -top-24 right-0 h-[400px] w-[600px] rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/10 blur-3xl" />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-emerald-300 backdrop-blur-xl">
              <BadgeCheck className="h-3.5 w-3.5" /> Triple M Confidence Program
            </div>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              We don't disappear after the sale.
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                We follow up like we mean it.
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Every CarIQ purchase enrolls you in the Confidence Program automatically. Real text-message check-ins, real
              maintenance reminders, real humans on the other end.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <Star className="h-4 w-4 text-amber-300" />
              <span>"Best dealership follow-up I've ever had." — Joaquin R., Hammond, IN</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <ConfidenceRow icon={<CalendarCheck className="h-4 w-4" />} day="Day 7" title="First check-in" desc="A real person calls — not a robot. Anything off, we make it right." />
            <ConfidenceRow icon={<Wrench className="h-4 w-4" />} day="Day 30" title="First oil change reminder" desc="Free, on us. We come to you within 30 miles of Saint John." />
            <ConfidenceRow icon={<Activity className="h-4 w-4" />} day="Day 90" title="3-month diagnostic" desc="Plug-in OBD check, no upsell, no pressure." />
            <ConfidenceRow icon={<MessageCircle className="h-4 w-4" />} day="Anytime" title="Bilingual support" desc="Inglés / Español · text or call. We answer." />
          </div>
        </div>
      </div>
    </section>
  );
}

function ConfidenceRow({
  icon,
  day,
  title,
  desc,
}: {
  icon: React.ReactNode;
  day: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition hover:bg-white/10">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 ring-1 ring-white/10 text-emerald-300">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">{day}</p>
        <p className="mt-1 text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   WHY STRIP
   ───────────────────────────────────────────────────────────────────────── */

function WhyStrip() {
  const items = [
    { icon: <Brain className="h-5 w-5" />, title: 'Transparent AI', body: 'Every car ships with a memo explaining exactly why we bought it.' },
    { icon: <ShieldCheck className="h-5 w-5" />, title: 'Approval-first', body: 'Soft-pull lender match before you ever fall in love with a car.' },
    { icon: <Activity className="h-5 w-5" />, title: 'Risk-scored', body: 'Mechanical risk gauge on every vehicle. No mystery boxes.' },
    { icon: <Languages className="h-5 w-5" />, title: 'Bilingual', body: 'Inglés y Español, en cada paso de la compra.' },
  ];
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-10">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 ring-1 ring-white/10 text-cyan-300">
              {it.icon}
            </div>
            <p className="mt-4 text-sm font-semibold text-white">{it.title}</p>
            <p className="mt-1 text-xs text-slate-400">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   CAR COACH (floating bilingual AI concierge)
   ───────────────────────────────────────────────────────────────────────── */

function CarCoach({
  open,
  setOpen,
  lang,
  setLang,
  car,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  lang: 'en' | 'es';
  setLang: (l: 'en' | 'es') => void;
  car: (Car & { approval: number }) | null;
}) {
  const greeting =
    lang === 'en'
      ? `Hi — I'm Marco, your CarIQ Coach. ${car ? `You're looking at the ${car.year} ${car.make} ${car.model}. ` : ''}Want me to walk you through approval, payments, or what to check on a test drive?`
      : `Hola — soy Marco, tu Coach de CarIQ. ${car ? `Estás viendo el ${car.year} ${car.make} ${car.model}. ` : ''}¿Quieres que te explique la aprobación, los pagos, o qué revisar en una prueba de manejo?`;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border border-white/10 bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_40px_-10px_rgba(34,211,238,0.6)] transition hover:opacity-90"
        >
          <div className="relative grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-cyan-300">
            <MessageCircle className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-slate-950" />
          </div>
          Car Coach · EN/ES
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 ring-1 ring-white/10">
                <Brain className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-white">Marco · Car Coach</p>
                <p className="flex items-center gap-1 text-[10px] text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Online · responds in ~1 min
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Lang toggle */}
          <div className="flex items-center gap-1 border-b border-white/5 bg-black/30 px-3 py-2">
            <Languages className="h-3.5 w-3.5 text-slate-400" />
            <button
              onClick={() => setLang('en')}
              className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                lang === 'en' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang('es')}
              className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                lang === 'es' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Español
            </button>
          </div>

          {/* Message stream */}
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-start gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400/30 to-violet-500/30 ring-1 ring-white/10">
                <Brain className="h-3.5 w-3.5 text-cyan-300" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                {greeting}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pl-9">
              <QuickReply lang={lang} en="What can I afford?" es="¿Qué puedo pagar?" />
              <QuickReply lang={lang} en="Explain the risk score" es="Explícame el puntaje de riesgo" />
              <QuickReply lang={lang} en="What docs do I need?" es="¿Qué documentos necesito?" />
            </div>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-white/5 bg-black/30 px-3 py-3">
            <input
              placeholder={lang === 'en' ? 'Ask Marco anything…' : 'Pregúntale a Marco…'}
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            />
            <button className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-300 hover:bg-white/10">
              <Mic className="h-4 w-4" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function QuickReply({ lang, en, es }: { lang: 'en' | 'es'; en: string; es: string }) {
  return (
    <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-300 transition hover:bg-white/10 hover:text-white">
      {lang === 'en' ? en : es}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   BACKGROUND FX
   ───────────────────────────────────────────────────────────────────────── */

function BackgroundFX() {
  return (
    <>
      {/* Base radial */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.10)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.10)_0%,_transparent_55%)]" />
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      {/* Soft orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 z-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 right-0 z-0 h-[600px] w-[600px] rounded-full bg-violet-500/10 blur-3xl" />
    </>
  );
}
