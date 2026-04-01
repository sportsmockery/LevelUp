'use client';

import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Treemap, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';

/* ── DATA ─────────────────────────────────────────────────────────── */

const BUDGET_TOTAL = 127500;
const PRIZE_POOL = 30000;
const OPERATING_BUDGET = 97500;

const CATEGORIES = [
  { name: 'Live Event Production', short: 'Production', total: 49200, color: '#2563EB' },
  { name: 'Marketing, Media & Broadcast', short: 'Marketing', total: 26300, color: '#E91E8C' },
  { name: 'Talent, VIP & Operations', short: 'Talent/VIP', total: 28400, color: '#8B5CF6' },
  { name: 'Brand Breakers Mgmt Fee', short: 'Management', total: 14300, color: '#F59E0B' },
];

interface LineItem {
  category: string;
  subcategory: string;
  item: string;
  description: string;
  unitCost: number;
  qty: number;
  total: number;
}

const LINE_ITEMS: LineItem[] = [
  // Production - Stage & Venue
  { category: 'Production', subcategory: 'Stage & Venue Setup', item: 'Stage Design & Fabrication', description: 'Custom WOD × Wind Creek branded stage backdrop, DJ booth facade, championship podium', unitCost: 3500, qty: 1, total: 3500 },
  { category: 'Production', subcategory: 'Stage & Venue Setup', item: 'Stage/Venue Setup Labor', description: 'Load-in, rigging, setup crew per live event', unitCost: 800, qty: 3, total: 2400 },
  { category: 'Production', subcategory: 'Stage & Venue Setup', item: 'House DJ Equipment', description: 'Pioneer CDJ-3000 + DJM-900 rental per event', unitCost: 500, qty: 3, total: 1500 },
  { category: 'Production', subcategory: 'Stage & Venue Setup', item: 'PA Sound System', description: 'Professional line array, subwoofers, monitor wedges per event', unitCost: 1200, qty: 3, total: 3600 },
  { category: 'Production', subcategory: 'Stage & Venue Setup', item: 'Lighting Package', description: 'Moving heads, LED wash, spotlight, haze machine per event', unitCost: 900, qty: 3, total: 2700 },
  { category: 'Production', subcategory: 'Stage & Venue Setup', item: 'Audio/Visual Tech (FOH)', description: 'Sound engineer + lighting tech per event', unitCost: 600, qty: 3, total: 1800 },
  // Production - Championship
  { category: 'Production', subcategory: 'Championship Night', item: 'Championship Trophies', description: '3 custom WOD × Wind Creek branded trophies', unitCost: 400, qty: 3, total: 1200 },
  { category: 'Production', subcategory: 'Championship Night', item: 'Championship Night Décor', description: 'Premium staging, podium, red carpet, step-and-repeat', unitCost: 2000, qty: 1, total: 2000 },
  { category: 'Production', subcategory: 'Championship Night', item: 'Signing Ceremony Setup', description: 'Signing table, contract displays, branded pens/folders', unitCost: 500, qty: 1, total: 500 },
  // Production - Prize Pool
  { category: 'Production', subcategory: 'Prize Pool', item: 'Cash Awards', description: '$10,000 per category champion × 3 categories', unitCost: 10000, qty: 3, total: 30000 },
  // Marketing - Broadcast
  { category: 'Marketing', subcategory: 'Broadcast & Streaming', item: 'Live Stream Production Crew', description: 'Director, camera operators (2), stream tech per event', unitCost: 1800, qty: 3, total: 5400 },
  { category: 'Marketing', subcategory: 'Broadcast & Streaming', item: 'Multi-Camera Setup', description: '3-camera package with capture cards, switcher, encoder', unitCost: 700, qty: 3, total: 2100 },
  { category: 'Marketing', subcategory: 'Broadcast & Streaming', item: 'Stream Graphics', description: 'Branded overlays, lower thirds, transition scenes', unitCost: 1200, qty: 1, total: 1200 },
  { category: 'Marketing', subcategory: 'Broadcast & Streaming', item: 'Highlight Reels', description: 'Edited highlight video per event + Championship recap', unitCost: 800, qty: 4, total: 3200 },
  // Marketing - Radio
  { category: 'Marketing', subcategory: 'Radio — Power 92', item: 'Promotional Spots', description: ':30 radio spots — 3×/week for 5 weeks', unitCost: 300, qty: 15, total: 4500 },
  { category: 'Marketing', subcategory: 'Radio — Power 92', item: 'DJ Feature Segments', description: 'Finalist DJ interviews / championship countdown', unitCost: 500, qty: 3, total: 1500 },
  // Marketing - Social
  { category: 'Marketing', subcategory: 'Social & Digital', item: 'Social Media Content', description: 'DJ profiles, countdown posts, genre cards, vote content', unitCost: 2500, qty: 1, total: 2500 },
  { category: 'Marketing', subcategory: 'Social & Digital', item: 'Paid Social Advertising', description: 'FB/IG/TikTok ads — Chicago metro, 5-week flight', unitCost: 500, qty: 5, total: 2500 },
  { category: 'Marketing', subcategory: 'Social & Digital', item: 'Email Marketing Platform', description: 'Mailchimp / Constant Contact — 5-week campaign', unitCost: 150, qty: 2, total: 300 },
  { category: 'Marketing', subcategory: 'Social & Digital', item: 'WOD Portal Hosting', description: 'WODdjs.com hosting, SSL, CDN', unitCost: 500, qty: 1, total: 500 },
  // Marketing - Print
  { category: 'Marketing', subcategory: 'Print & In-Casino', item: 'In-Casino Signage & Banners', description: 'Digital screen graphics, printed banners, floor decals', unitCost: 1200, qty: 1, total: 1200 },
  { category: 'Marketing', subcategory: 'Print & In-Casino', item: 'Event Flyers & Promo Materials', description: 'Flyers, table tents, VIP invitations', unitCost: 600, qty: 1, total: 600 },
  { category: 'Marketing', subcategory: 'Print & In-Casino', item: 'Step-and-Repeat / Photo Wall', description: 'WOD × Wind Creek branded press wall', unitCost: 800, qty: 1, total: 800 },
  // Talent - Staffing
  { category: 'Talent/VIP', subcategory: 'Event Talent & Staffing', item: 'Event Host / MC', description: 'Professional host for all 3 live events', unitCost: 750, qty: 3, total: 2250 },
  { category: 'Talent/VIP', subcategory: 'Event Talent & Staffing', item: 'Judges Panel', description: '3 judges per event — local personalities, industry pros', unitCost: 300, qty: 9, total: 2700 },
  { category: 'Talent/VIP', subcategory: 'Event Talent & Staffing', item: 'DJ Stipends (Non-Champion)', description: 'Performance stipend for 6 eliminated DJs', unitCost: 250, qty: 6, total: 1500 },
  { category: 'Talent/VIP', subcategory: 'Event Talent & Staffing', item: 'Security Personnel', description: 'Door, floor, VIP section security per event', unitCost: 600, qty: 3, total: 1800 },
  { category: 'Talent/VIP', subcategory: 'Event Talent & Staffing', item: 'Event Coordinator / Staff', description: 'Brand Breakers production staff (2 per event)', unitCost: 400, qty: 6, total: 2400 },
  { category: 'Talent/VIP', subcategory: 'Event Talent & Staffing', item: 'Photography — Lite Wurks', description: 'Event photography per live event', unitCost: 600, qty: 3, total: 1800 },
  // Talent - VIP
  { category: 'Talent/VIP', subcategory: 'VIP & High Roller', item: 'VIP Gift Packages', description: 'Custom gift box — est. 30 guests × 3 events', unitCost: 45, qty: 90, total: 4050 },
  { category: 'Talent/VIP', subcategory: 'VIP & High Roller', item: 'VIP Section Furnishings', description: 'Upgraded seating, branded covers, velvet ropes', unitCost: 500, qty: 3, total: 1500 },
  { category: 'Talent/VIP', subcategory: 'VIP & High Roller', item: 'Special Guest Coordination', description: 'Celebrity/influencer/media VIP attendee fees', unitCost: 1000, qty: 3, total: 3000 },
  { category: 'Talent/VIP', subcategory: 'VIP & High Roller', item: 'Championship Night VIP Upgrade', description: 'Champagne toast, custom gifts for Championship', unitCost: 1500, qty: 1, total: 1500 },
  // Talent - Operations
  { category: 'Talent/VIP', subcategory: 'General Operations', item: 'Insurance — Event Liability', description: 'General liability for all 3 events + production', unitCost: 1200, qty: 1, total: 1200 },
  { category: 'Talent/VIP', subcategory: 'General Operations', item: 'Transportation & Logistics', description: 'Equipment transport, crew travel, load-in/out', unitCost: 400, qty: 3, total: 1200 },
  { category: 'Talent/VIP', subcategory: 'General Operations', item: 'Meals & Crew Catering', description: 'Production crew meals per event day', unitCost: 300, qty: 3, total: 900 },
  { category: 'Talent/VIP', subcategory: 'General Operations', item: 'Contingency (10%)', description: 'Unexpected expenses buffer', unitCost: 2600, qty: 1, total: 2600 },
  // Management
  { category: 'Management', subcategory: 'Brand Breakers Fee', item: 'Pre-Season Strategy & Setup', description: 'Portal dev, DJ outreach, submissions, marketing strategy', unitCost: 4000, qty: 1, total: 4000 },
  { category: 'Management', subcategory: 'Brand Breakers Fee', item: 'Season Management (5 Weeks)', description: 'Content publishing, vote monitoring, DJ comms, social', unitCost: 3000, qty: 1, total: 3000 },
  { category: 'Management', subcategory: 'Brand Breakers Fee', item: 'Live Event Execution (×3)', description: 'On-site production leadership, run-of-show, talent', unitCost: 4500, qty: 1, total: 4500 },
  { category: 'Management', subcategory: 'Brand Breakers Fee', item: 'Signing & Champion Activation', description: 'Legal coordination, agreements, DJ roster onboarding', unitCost: 2000, qty: 1, total: 2000 },
  { category: 'Management', subcategory: 'Brand Breakers Fee', item: 'Post-Season Reporting', description: 'Contact list, highlight reels, season recap for Wind Creek', unitCost: 800, qty: 1, total: 800 },
];

const ROI_DATA = [
  { source: 'Gaming Floor Revenue', low: 96000, high: 192000, color: '#2563EB' },
  { source: 'F&B Revenue', low: 18000, high: 36000, color: '#E91E8C' },
  { source: 'Rewards Sign-Ups', low: 30000, high: 30000, color: '#8B5CF6' },
  { source: 'Contact List Value', low: 5000, high: 50000, color: '#10B981' },
  { source: 'Earned Media & PR', low: 40000, high: 80000, color: '#F59E0B' },
  { source: 'DJ Roster Savings', low: 50000, high: 100000, color: '#EF4444' },
];

const PER_EVENT_COSTS = [
  { event: 'Event #1 (Jun 13)', production: 5500, marketing: 4200, talent: 6400, mgmt: 0 },
  { event: 'Event #2 (Jun 20)', production: 5500, marketing: 4200, talent: 6400, mgmt: 0 },
  { event: 'Championship (Jul 4)', production: 8200, marketing: 4200, talent: 9700, mgmt: 0 },
  { event: 'Season-Long', production: 0, marketing: 13700, talent: 5900, mgmt: 14300 },
];

/* ── HELPERS ──────────────────────────────────────────────────────── */

const fmt = (n: number) => '$' + n.toLocaleString();
const pct = (n: number, d: number) => ((n / d) * 100).toFixed(1) + '%';

const CAT_COLOR: Record<string, string> = {
  Production: '#2563EB',
  Marketing: '#E91E8C',
  'Talent/VIP': '#8B5CF6',
  Management: '#F59E0B',
};

/* ── CUSTOM TOOLTIP ──────────────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 shadow-2xl">
      {label && <p className="text-zinc-400 text-xs mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ── TREEMAP CUSTOM CONTENT ──────────────────────────────────────── */

function TreemapContent(props: { x: number; y: number; width: number; height: number; name: string; total: number; color: string; depth: number; index: number }) {
  const { x, y, width, height, name, total, color, depth } = props;
  if (depth !== 1) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} fill={color} fillOpacity={0.85} stroke="#18181b" strokeWidth={2} />
      {width > 70 && height > 40 && (
        <>
          <text x={x + 10} y={y + 22} fill="#fff" fontSize={12} fontWeight={600}>{name}</text>
          <text x={x + 10} y={y + 40} fill="rgba(255,255,255,0.7)" fontSize={11}>{fmt(total)}</text>
        </>
      )}
    </g>
  );
}

/* ── TAB TYPES ────────────────────────────────────────────────────── */

type Tab = 'overview' | 'breakdown' | 'roi' | 'timeline' | 'detail';

/* ── MAIN COMPONENT ──────────────────────────────────────────────── */

export default function WODBudgetDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return LINE_ITEMS;
    return LINE_ITEMS.filter(li => li.category === selectedCategory);
  }, [selectedCategory]);

  const subcategoryData = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach(li => {
      map.set(li.subcategory, (map.get(li.subcategory) || 0) + li.total);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredItems]);

  const treemapData = useMemo(() => {
    return subcategoryData.map((s, i) => ({
      name: s.name,
      total: s.value,
      color: ['#2563EB', '#E91E8C', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#F97316', '#84CC16', '#EC4899'][i % 10],
    }));
  }, [subcategoryData]);

  const roiLow = ROI_DATA.reduce((s, r) => s + r.low, 0);
  const roiHigh = ROI_DATA.reduce((s, r) => s + r.high, 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'roi', label: 'ROI Analysis' },
    { id: 'timeline', label: 'Per-Event' },
    { id: 'detail', label: 'Line Items' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* HEADER */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#E91E8C] flex items-center justify-center text-lg font-bold">W</div>
                <div>
                  <h1 className="text-2xl font-heading tracking-tight">WHO&apos;S ON DECK</h1>
                  <p className="text-zinc-500 text-sm">Wind Creek Casino Championship Series &middot; Homewood, IL</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Season</p>
                <p className="text-sm font-medium">June &ndash; July 2026</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Duration</p>
                <p className="text-sm font-medium">5 Weeks</p>
              </div>
              <div className="bg-zinc-900 rounded-2xl px-5 py-3 border border-zinc-800">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Confidential</p>
                <p className="text-xs text-zinc-600">The Brand Breakers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard label="Total Budget" value={fmt(BUDGET_TOTAL)} accent="#2563EB" large />
          <KPICard label="Operating Budget" value={fmt(OPERATING_BUDGET)} accent="#8B5CF6" />
          <KPICard label="Prize Pool" value={fmt(PRIZE_POOL)} accent="#E91E8C" />
          <KPICard label="Cost Per Event" value={fmt(Math.round(OPERATING_BUDGET / 3))} accent="#F59E0B" sub="avg across 3 events" />
          <KPICard label="Est. ROI" value={`${((roiLow + roiHigh) / 2 / BUDGET_TOTAL).toFixed(1)}×`} accent="#10B981" sub={`${fmt(roiLow)}–${fmt(roiHigh)}`} />
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-1 bg-zinc-900/50 rounded-2xl p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-zinc-800 text-white shadow-lg'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'breakdown' && (
          <BreakdownTab
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filteredItems={filteredItems}
            subcategoryData={subcategoryData}
            treemapData={treemapData}
          />
        )}
        {activeTab === 'roi' && <ROITab roiLow={roiLow} roiHigh={roiHigh} />}
        {activeTab === 'timeline' && <TimelineTab />}
        {activeTab === 'detail' && (
          <DetailTab
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filteredItems={filteredItems}
          />
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-zinc-800 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between text-zinc-600 text-xs">
          <span>Prepared by The Brand Breakers &middot; marketing@thebrandbreakers.com &middot; (312) 358-3378</span>
          <span>Confidential &middot; 2026</span>
        </div>
      </div>
    </div>
  );
}

/* ── KPI CARD ─────────────────────────────────────────────────────── */

function KPICard({ label, value, accent, sub, large }: { label: string; value: string; accent: string; sub?: string; large?: boolean }) {
  return (
    <div className={`bg-zinc-900 rounded-2xl p-5 border border-zinc-800 ${large ? 'md:col-span-1' : ''}`}>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-heading tracking-tight ${large ? 'text-3xl' : 'text-2xl'}`} style={{ color: accent }}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */

function OverviewTab() {
  const pieData = CATEGORIES.map(c => ({ name: c.short, value: c.total, color: c.color }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <Card title="Budget Allocation" subtitle="by category">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 justify-center">
          {pieData.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-zinc-400">{d.name} ({pct(d.value, BUDGET_TOTAL)})</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Category Bars */}
      <Card title="Category Comparison" subtitle="total spend per category">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CATEGORIES} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#71717a', fontSize: 11 }} />
              <YAxis type="category" dataKey="short" tick={{ fill: '#a1a1aa', fontSize: 12 }} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total" name="Total" radius={[0, 8, 8, 0]}>
                {CATEGORIES.map((c, i) => (
                  <Cell key={i} fill={c.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Budget Health Indicators */}
      <Card title="Budget Health" subtitle="key ratios & metrics" full>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBar label="Prize Pool Ratio" value={PRIZE_POOL / BUDGET_TOTAL} color="#E91E8C" detail={`${pct(PRIZE_POOL, BUDGET_TOTAL)} of total budget`} />
          <MetricBar label="Marketing Efficiency" value={26300 / BUDGET_TOTAL} color="#2563EB" detail={`${pct(26300, BUDGET_TOTAL)} allocated to reach`} />
          <MetricBar label="Production Weight" value={49200 / BUDGET_TOTAL} color="#8B5CF6" detail={`${pct(49200, BUDGET_TOTAL)} on event production`} />
          <MetricBar label="Management Overhead" value={14300 / BUDGET_TOTAL} color="#F59E0B" detail={`${pct(14300, BUDGET_TOTAL)} management fee`} />
        </div>
      </Card>

      {/* Radar - Spend Distribution */}
      <Card title="Spend Profile" subtitle="multi-dimensional view" full>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={[
              { dim: 'Venue & Stage', value: 15500 },
              { dim: 'Broadcast', value: 11900 },
              { dim: 'Marketing', value: 10600 },
              { dim: 'Talent', value: 12450 },
              { dim: 'VIP Experience', value: 10050 },
              { dim: 'Operations', value: 5900 },
              { dim: 'Prize Pool', value: 30000 },
              { dim: 'Management', value: 14300 },
            ]}>
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis dataKey="dim" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: '#52525b', fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Radar name="Spend" dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.2} strokeWidth={2} />
              <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ── BREAKDOWN TAB ────────────────────────────────────────────────── */

function BreakdownTab({
  selectedCategory,
  setSelectedCategory,
  filteredItems,
  subcategoryData,
  treemapData,
}: {
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  filteredItems: LineItem[];
  subcategoryData: { name: string; value: number }[];
  treemapData: { name: string; total: number; color: string }[];
}) {
  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            !selectedCategory ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          All Categories
        </button>
        {['Production', 'Marketing', 'Talent/VIP', 'Management'].map(c => (
          <button
            key={c}
            onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === c ? 'text-white' : 'text-zinc-400 hover:text-white border border-zinc-800'
            }`}
            style={selectedCategory === c ? { backgroundColor: CAT_COLOR[c] } : { backgroundColor: '#18181b' }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treemap */}
        <Card title="Expense Treemap" subtitle={selectedCategory || 'all categories'}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="total"
                stroke="#18181b"
                content={<TreemapContent x={0} y={0} width={0} height={0} name="" total={0} color="" depth={0} index={0} />}
              />
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Subcategory Bars */}
        <Card title="Subcategory Spend" subtitle="sorted by total">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subcategoryData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={130} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Total" fill="#2563EB" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top 10 Expenses */}
      <Card title="Top 10 Line Items" subtitle="highest individual costs" full>
        <div className="space-y-3">
          {[...filteredItems]
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .map((li, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-zinc-600 text-sm w-6 text-right font-mono">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">{li.item}</span>
                      <span className="text-zinc-600 text-xs ml-2">{li.category}</span>
                    </div>
                    <span className="text-sm font-heading" style={{ color: CAT_COLOR[li.category] || '#fff' }}>{fmt(li.total)}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(li.total / (filteredItems[0]?.total || 1)) * 100}%`,
                        backgroundColor: CAT_COLOR[li.category] || '#2563EB',
                        maxWidth: `${(li.total / 30000) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

/* ── ROI TAB ──────────────────────────────────────────────────────── */

function ROITab({ roiLow, roiHigh }: { roiLow: number; roiHigh: number }) {
  return (
    <div className="space-y-6">
      {/* ROI KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Investment" value={fmt(BUDGET_TOTAL)} accent="#EF4444" />
        <KPICard label="Conservative Return" value={fmt(roiLow)} accent="#F59E0B" sub={`${(roiLow / BUDGET_TOTAL).toFixed(1)}× ROI`} />
        <KPICard label="Optimistic Return" value={fmt(roiHigh)} accent="#10B981" sub={`${(roiHigh / BUDGET_TOTAL).toFixed(1)}× ROI`} />
        <KPICard label="Mid-Range ROI" value={`${((roiLow + roiHigh) / 2 / BUDGET_TOTAL).toFixed(1)}×`} accent="#2563EB" sub={fmt(Math.round((roiLow + roiHigh) / 2))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Waterfall */}
        <Card title="Revenue & Value Sources" subtitle="conservative vs optimistic range">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ROI_DATA} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis type="category" dataKey="source" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={120} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="low" name="Conservative" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={14} />
                <Bar dataKey="high" name="Optimistic" fill="#10B981" radius={[0, 4, 4, 0]} barSize={14} />
                <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ROI Breakdown Table */}
        <Card title="Value Offset Detail" subtitle="per revenue stream">
          <div className="space-y-4">
            {ROI_DATA.map((r, i) => {
              const mid = (r.low + r.high) / 2;
              const pctOfTotal = mid / ((roiLow + roiHigh) / 2) * 100;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{r.source}</span>
                    <span className="text-sm text-zinc-400">{fmt(r.low)} &ndash; {fmt(r.high)}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pctOfTotal}%`, backgroundColor: r.color }} />
                  </div>
                  <p className="text-xs text-zinc-600">{pctOfTotal.toFixed(1)}% of total return value</p>
                </div>
              );
            })}
            <div className="border-t border-zinc-800 pt-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-heading">Total Value Return</span>
                <span className="text-sm font-heading text-[#10B981]">{fmt(roiLow)} &ndash; {fmt(roiHigh)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Break-Even Visualization */}
      <Card title="Break-Even Analysis" subtitle="investment recovery at different attendance levels" full>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[200, 400, 600, 800, 1000, 1200, 1600, 2000, 2400].map(att => ({
                attendees: att,
                gaming: att * 80,
                fb: att * 25,
                total: att * 80 + att * 25 + 30000 + 40000,
              }))}
              margin={{ left: 10, right: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="attendees" tick={{ fill: '#71717a', fontSize: 11 }} label={{ value: 'Total Attendees (3 events)', position: 'insideBottom', offset: -5, fill: '#52525b', fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#71717a', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" name="Projected Revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} />
              {/* Break-even reference line */}
              <Area type="monotone" dataKey={() => BUDGET_TOTAL} name="Budget" stroke="#EF4444" fill="none" strokeWidth={2} strokeDasharray="8 4" />
              <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ── TIMELINE TAB ─────────────────────────────────────────────────── */

function TimelineTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Bar */}
        <Card title="Cost Per Event" subtitle="category breakdown by event">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PER_EVENT_COSTS} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="event" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
                <Bar dataKey="production" name="Production" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
                <Bar dataKey="marketing" name="Marketing" stackId="a" fill="#E91E8C" />
                <Bar dataKey="talent" name="Talent/VIP" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="mgmt" name="Management" stackId="a" fill="#F59E0B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Event Timeline */}
        <Card title="Event Timeline" subtitle="5-week season schedule">
          <div className="space-y-6 py-2">
            {[
              { date: 'May 18', label: 'Portal Launch', desc: 'WODdjs.com goes live, DJ submissions open', type: 'milestone' },
              { date: 'May 18 – Jun 12', label: 'Pre-Season', desc: 'Power 92 campaign, social media blitz, voting', type: 'period' },
              { date: 'Jun 13', label: 'Live Event #1', desc: 'First elimination round at Wind Creek', type: 'event' },
              { date: 'Jun 20', label: 'Live Event #2', desc: 'Second elimination round', type: 'event' },
              { date: 'Jul 4', label: 'Championship Night', desc: 'Finals + signing ceremony — Independence Day', type: 'finale' },
              { date: 'Jul 5 – Aug', label: 'Post-Season', desc: 'Recap report, highlight reels, CRM handoff', type: 'period' },
            ].map((ev, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${
                    ev.type === 'finale' ? 'bg-[#E91E8C]' :
                    ev.type === 'event' ? 'bg-[#2563EB]' :
                    ev.type === 'milestone' ? 'bg-[#F59E0B]' :
                    'bg-zinc-600'
                  }`} />
                  {i < 5 && <div className="w-px h-8 bg-zinc-800 mt-1" />}
                </div>
                <div className="-mt-1">
                  <p className="text-xs text-zinc-500 font-mono">{ev.date}</p>
                  <p className={`text-sm font-medium ${ev.type === 'finale' ? 'text-[#E91E8C]' : ''}`}>{ev.label}</p>
                  <p className="text-xs text-zinc-500">{ev.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Per-Event Cost Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: 'Event #1 — Jun 13', total: 16100, highlight: false },
          { name: 'Event #2 — Jun 20', total: 16100, highlight: false },
          { name: 'Championship — Jul 4', total: 22100, highlight: true },
        ].map((ev, i) => (
          <div
            key={i}
            className={`rounded-2xl p-5 border ${
              ev.highlight
                ? 'bg-gradient-to-br from-[#E91E8C]/10 to-zinc-900 border-[#E91E8C]/30'
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <p className="text-zinc-400 text-xs uppercase tracking-wider">{ev.name}</p>
            <p className="text-2xl font-heading mt-1">{fmt(ev.total)}</p>
            <p className="text-zinc-600 text-xs mt-1">est. per-event direct cost</p>
            {ev.highlight && (
              <div className="mt-3 bg-[#E91E8C]/10 rounded-xl px-3 py-2">
                <p className="text-[#E91E8C] text-xs font-medium">Includes trophy production, premium décor, signing ceremony, VIP upgrade</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── DETAIL TAB ───────────────────────────────────────────────────── */

function DetailTab({
  selectedCategory,
  setSelectedCategory,
  filteredItems,
}: {
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  filteredItems: LineItem[];
}) {
  const totalFiltered = filteredItems.reduce((s, li) => s + li.total, 0);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-zinc-500 text-sm mr-2">Filter:</span>
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !selectedCategory ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
          }`}
        >
          All ({LINE_ITEMS.length})
        </button>
        {['Production', 'Marketing', 'Talent/VIP', 'Management'].map(c => {
          const count = LINE_ITEMS.filter(li => li.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === c ? 'text-white' : 'text-zinc-400 border border-zinc-800'
              }`}
              style={selectedCategory === c ? { backgroundColor: CAT_COLOR[c] } : { backgroundColor: '#18181b' }}
            >
              {c} ({count})
            </button>
          );
        })}
        <span className="text-zinc-500 text-sm ml-auto">{filteredItems.length} items &middot; {fmt(totalFiltered)}</span>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">Category</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">Subcategory</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">Line Item</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium hidden lg:table-cell">Description</th>
                <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">Unit Cost</th>
                <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">Qty</th>
                <th className="text-right px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((li, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CAT_COLOR[li.category] }} />
                    <span className="text-zinc-400">{li.category}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{li.subcategory}</td>
                  <td className="px-4 py-3 font-medium">{li.item}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell max-w-xs truncate">{li.description}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">{fmt(li.unitCost)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">{li.qty}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium" style={{ color: CAT_COLOR[li.category] }}>{fmt(li.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700">
                <td colSpan={6} className="px-4 py-3 text-right font-heading text-zinc-400 uppercase text-xs tracking-wider">Total</td>
                <td className="px-4 py-3 text-right font-heading text-lg">{fmt(totalFiltered)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── METRIC BAR ───────────────────────────────────────────────────── */

function MetricBar({ label, value, color, detail }: { label: string; value: number; color: string; detail: string }) {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-2">{label}</p>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-zinc-400">{detail}</p>
    </div>
  );
}

/* ── CARD WRAPPER ─────────────────────────────────────────────────── */

function Card({ title, subtitle, children, full }: { title: string; subtitle: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`bg-zinc-900 rounded-2xl border border-zinc-800 p-6 ${full ? 'lg:col-span-2' : ''}`}>
      <div className="mb-4">
        <h3 className="text-base font-heading">{title}</h3>
        <p className="text-zinc-500 text-xs">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
