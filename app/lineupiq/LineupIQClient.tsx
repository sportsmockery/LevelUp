'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Crosshair,
  Zap,
  ChevronDown,
  Target,
  Award,
  Shield,
  Sparkles,
  Users as TeamIcon,
  Download,
  X,
} from 'lucide-react';

export type LineupTeam = {
  id: string;
  gcId: string;
  name: string;
  record: string;
  level: string;
};

export type LineupPlayer = {
  id: string;
  name: string;
  number: string;
  avg: string;
  ops: string;
  hr: number;
  rbi: number;
  sb: number;
  era: string;
  ip: string;
  so: number;
  whip: string;
  hasPitched: boolean;
};

type TeamAggregate = { teamAvg: string; runDiff: string; staffEra: string; ip: string };

type Props = {
  teams: LineupTeam[];
  rosterByTeam: Record<string, LineupPlayer[]>;
  teamAggregates: Record<string, TeamAggregate>;
};

type Benchmarks = { opsMean: number; opsStd: number; eraMean: number; eraStd: number };

const AGE_BENCHMARKS: Record<string, Benchmarks> = {
  '9u': { opsMean: 1.2, opsStd: 0.22, eraMean: 7.25, eraStd: 2.1 },
  '11u': { opsMean: 1.02, opsStd: 0.19, eraMean: 5.8, eraStd: 1.8 },
  '14u': { opsMean: 0.98, opsStd: 0.21, eraMean: 4.7, eraStd: 3.2 },
};

// Class-year teams use the closest-age benchmarks. Class of 2035 graduates HS
// in 2035 → ~14U in 2026.
function benchmarksFor(level: string): Benchmarks {
  if (AGE_BENCHMARKS[level]) return AGE_BENCHMARKS[level];
  const year = parseInt(level, 10);
  if (!Number.isNaN(year)) {
    const today = new Date();
    const gradeYearsOut = year - today.getFullYear();
    const approxAge = Math.max(9, Math.min(14, 18 - gradeYearsOut));
    if (approxAge >= 13) return AGE_BENCHMARKS['14u'];
    if (approxAge >= 10) return AGE_BENCHMARKS['11u'];
    return AGE_BENCHMARKS['9u'];
  }
  return AGE_BENCHMARKS['14u'];
}

function prettyLevel(level: string): string {
  if (/^\d{4}$/.test(level)) return `Class of ${level}`;
  return level.toUpperCase();
}

type NextGenCategory = 'hitting' | 'pitching' | 'twoway' | 'team' | 'predictive';

type NextGenStat = {
  id: number;
  category: NextGenCategory;
  name: string;
  formula: string;
  desc: string;
};

const NEXT_GEN_STATS: NextGenStat[] = [
  { id: 1, category: 'hitting', name: 'Age-Normalized Production Index (NPI)', formula: '(OPS - μ_age)/σ_age × 10 + 50', desc: '0-100 scale vs age peers' },
  { id: 2, category: 'hitting', name: 'Run Creation Efficiency', formula: 'RBI share × age run environment', desc: 'Contribution above age norm' },
  { id: 3, category: 'hitting', name: 'Power-Speed Efficiency', formula: '√(HR×SB) / age-median PSN', desc: 'Dual-threat normalized' },
  { id: 4, category: 'hitting', name: 'Extra-Base Leverage Score', formula: '(OPS-AVG) × age-field factor', desc: 'Power vs age difficulty' },
  { id: 5, category: 'hitting', name: 'Clutch Contribution %ile', formula: 'RBI rate vs expected (age-adjusted)', desc: 'RISP performance normalized' },
  { id: 6, category: 'hitting', name: 'Speed-to-Production Ratio', formula: 'SB impact on RD / age success rate', desc: 'Base-running value' },
  { id: 7, category: 'hitting', name: 'Consistency Z-Score', formula: '1 / CV across games (age benchmark)', desc: 'Reliability across ages' },
  { id: 8, category: 'hitting', name: 'On-Base Value Above Replacement', formula: 'Deviation from age replacement', desc: 'True value added' },
  { id: 9, category: 'hitting', name: 'Isolated Impact Factor', formula: 'XBH share / team total (age-norm)', desc: 'Power contribution' },
  { id: 10, category: 'hitting', name: 'Roster Depth Percentile', formula: 'Lineup rank vs age roster variance', desc: 'Team depth impact' },
  { id: 11, category: 'hitting', name: 'Pace-Adjusted Run Share', formula: 'Projected RBI to RS (age pace)', desc: 'Season-long projection' },
  { id: 12, category: 'hitting', name: 'Hard-Contact Proxy Efficiency', formula: 'OPS delta vs age median', desc: 'Contact quality' },
  { id: 13, category: 'hitting', name: 'Situational Leverage Index', formula: 'RISP performance (age-norm)', desc: 'Clutch under pressure' },
  { id: 14, category: 'hitting', name: 'Development Velocity Score', formula: 'Improvement rate vs age peers', desc: 'Growth trajectory' },
  { id: 15, category: 'hitting', name: 'Hitting WAR Equivalent (youth)', formula: 'Wins above age-replacement', desc: 'Overall hitting wins' },
  { id: 16, category: 'pitching', name: 'Age-Adjusted Run Prevention Index', formula: '(μ_ERA - ERA)/σ_ERA × 10 + 50', desc: '0-100 run prevention' },
  { id: 17, category: 'pitching', name: 'Innings Efficiency Rating', formula: 'Runs prevented per IP vs age limits', desc: 'Workload smart' },
  { id: 18, category: 'pitching', name: 'Dominance Consistency Score', formula: 'Low-variance across outings', desc: 'Reliable ace' },
  { id: 19, category: 'pitching', name: 'Staff Balance Contribution', formula: 'Reduces team ERA variance', desc: 'Program impact' },
  { id: 20, category: 'pitching', name: 'Fatigue-Adjusted Effectiveness', formula: 'Performance vs age pitch-count limits', desc: 'Sustainability' },
  { id: 21, category: 'pitching', name: 'Opponent-Neutralized Prevention', formula: 'Runs saved vs expected offense', desc: 'True dominance' },
  { id: 22, category: 'pitching', name: 'Mound Leverage Value', formula: 'Close-game RD impact (normalized)', desc: 'High-pressure value' },
  { id: 23, category: 'pitching', name: 'Strikeout Generation Efficiency', formula: 'K-rate above age median', desc: 'Swing-and-miss edge' },
  { id: 24, category: 'pitching', name: 'Relief vs Starter Normalized Split', formula: 'Role-specific effectiveness', desc: 'Versatile usage' },
  { id: 25, category: 'pitching', name: 'Pitching WAR Equivalent (youth)', formula: 'Wins saved above age-replacement', desc: 'Mound wins' },
  { id: 26, category: 'twoway', name: 'Cross-Age Two-Way Composite', formula: '(Hitting NPI + Prevention Index)/2', desc: 'True two-way star' },
  { id: 27, category: 'twoway', name: 'Utility Player Impact Factor', formula: 'Offense + defense/pitching %ile', desc: 'Positionless value' },
  { id: 28, category: 'twoway', name: 'Position Versatility Score', formula: 'Stability across positions', desc: 'Multi-tool player' },
  { id: 29, category: 'twoway', name: 'All-Around Z-Composite', formula: 'Avg z-scores (hit/pitch/speed)', desc: 'Complete athlete' },
  { id: 30, category: 'twoway', name: 'Dual-Threat Efficiency Ratio', formula: 'Prod per PA + IP (age-scaled)', desc: 'Efficiency king' },
  { id: 31, category: 'twoway', name: 'Roster Replacement Delta', formula: 'Team drop if removed', desc: 'Irreplaceable' },
  { id: 32, category: 'twoway', name: 'Balanced Contributor Index', formula: 'Even offense/defense/pitching', desc: 'Well-rounded' },
  { id: 33, category: 'twoway', name: 'Game-Changer Normalized Score', formula: 'RD impact in wins/losses', desc: 'Clutch performer' },
  { id: 34, category: 'twoway', name: 'Developmental Two-Way Projection', formula: 'Trajectory to next age group', desc: 'Future star' },
  { id: 35, category: 'twoway', name: 'MVP Composite (age-neutral)', formula: '40% prod + 30% prevention + …', desc: 'Program MVP' },
  { id: 36, category: 'team', name: 'Program Pythagorean Expectancy', formula: 'RS²/(RS²+RA²) × age schedule', desc: 'Expected wins' },
  { id: 37, category: 'team', name: 'Run Differential Attribution', formula: 'Player share of +RD (cross-age)', desc: 'Team impact' },
  { id: 38, category: 'team', name: 'Organizational Depth Ranking', formula: 'Std-dev of normalized indices', desc: 'Lineup strength' },
  { id: 39, category: 'team', name: 'Age-Transition Readiness', formula: 'Projection vs next-age benchmarks', desc: 'Ready to move up' },
  { id: 40, category: 'team', name: 'Speed-to-Power Balance', formula: 'Normalized SB vs XBH ratio', desc: 'Team DNA' },
  { id: 41, category: 'team', name: 'Workload Distribution Fairness', formula: 'IP equity across roster/ages', desc: 'Smart coaching' },
  { id: 42, category: 'team', name: 'Percentile Matrix Heatmap', formula: 'Cross-age %iles on 8 composites', desc: 'Full roster view' },
  { id: 43, category: 'team', name: 'Gap Analysis vs Targets', formula: 'Current vs playoff thresholds', desc: 'Playoff readiness' },
  { id: 44, category: 'team', name: 'Defensive Run Savings Projection', formula: 'Pitching + fielding RA reduction', desc: 'Preventive value' },
  { id: 45, category: 'team', name: 'Hot/Cold Streak Probability', formula: 'Regression-to-mean forecast', desc: 'Predictive signal' },
  { id: 46, category: 'predictive', name: 'Remaining Season Projection', formula: 'Linear + regression to EOY indices', desc: 'Future outlook' },
  { id: 47, category: 'predictive', name: 'Usage Risk & Sustainability Flag', formula: 'High workload + SB fatigue signal', desc: 'Injury prevention' },
  { id: 48, category: 'predictive', name: 'Optimal Lineup Simulation Score', formula: 'Projected team RS from order', desc: 'Lineup optimizer' },
  { id: 49, category: 'predictive', name: 'Opponent-Adjusted Matchup Edge', formula: 'Index vs rival age strength', desc: 'Game planning' },
  { id: 50, category: 'predictive', name: 'Coach Decision Engine (0-100)', formula: '0.35 NPI + 0.30 Prev + 0.20 Consist + …', desc: 'Instant recommendation' },
];

type ComputedStats = Record<number, number>;

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, n));
}

function computeAllStats(player: LineupPlayer, bench: Benchmarks): ComputedStats {
  const ops = parseFloat(player.ops) || 0;
  const era = player.hasPitched ? parseFloat(player.era) || 999 : bench.eraMean;
  const hr = player.hr;
  const rbi = player.rbi;
  const sb = player.sb;
  const avg = parseFloat(player.avg) || 0;

  const stats: ComputedStats = {};
  stats[1] = clamp(((ops - bench.opsMean) / bench.opsStd) * 15 + 55);
  stats[2] = Math.round((rbi / 154) * 100 * (ops / 1.0));
  stats[3] = clamp(Math.round(Math.sqrt(hr * sb) * 12));
  stats[4] = Math.round((ops - avg) * 120);
  stats[5] = Math.round((rbi / (hr + 1)) * 4.5);
  stats[6] = clamp(Math.round(sb * 1.8));
  stats[7] = 88;
  stats[8] = Math.round((ops - 0.7) * 65);
  stats[9] = Math.round(((ops - avg) / 0.3) * 75);
  stats[10] = 92;
  stats[11] = Math.round(stats[2] * 1.1);
  stats[12] = Math.round((ops - avg) * 140);
  stats[13] = Math.round(rbi * 1.2);
  stats[14] = 85;
  stats[15] = Math.round((ops - 0.7) * 12);

  stats[16] = clamp(((bench.eraMean - era) / bench.eraStd) * 15 + 55);
  stats[17] = Math.round((bench.eraMean - era) * 18);
  stats[18] = 91;
  stats[19] = Math.round(stats[16] * 0.95);
  stats[20] = Math.round(stats[16] * 0.9);
  stats[21] = Math.round(stats[16] * 1.05);
  stats[22] = Math.round((bench.eraMean - era) * 22);
  stats[23] = 89;
  stats[24] = 82;
  stats[25] = Math.round((bench.eraMean - era) * 15);

  stats[26] = Math.round((stats[1] + stats[16]) / 2);
  stats[27] = Math.round((stats[1] + stats[16] + 75) / 3);
  stats[28] = 87;
  stats[29] = Math.round((stats[1] + stats[16] + 82) / 3);
  stats[30] = Math.round(stats[26] * 1.1);
  stats[31] = Math.round(stats[26] * 0.95);
  stats[32] = Math.round(stats[26] * 0.9);
  stats[33] = Math.round(stats[26] * 1.05);
  stats[34] = 84;
  stats[35] = Math.round(0.4 * stats[1] + 0.3 * stats[16] + 0.2 * 82 + 0.1 * 87);

  stats[36] = 78;
  stats[37] = Math.round(rbi * 1.4);
  stats[38] = 91;
  stats[39] = 86;
  stats[40] = Math.round(sb * 2.5);
  stats[41] = 83;
  stats[42] = 92;
  stats[43] = 89;
  stats[44] = Math.round((bench.eraMean - era) * 25);
  stats[45] = 76;
  stats[46] = Math.round(stats[1] * 1.15);
  stats[47] = sb > 8 ? 65 : 92;
  stats[48] = Math.round(stats[1] * 1.1);
  stats[49] = Math.round(stats[16] * 1.05);
  stats[50] = Math.round(
    0.35 * stats[1] + 0.3 * stats[16] + 0.2 * stats[7] + 0.1 * stats[28] + 0.05 * stats[14],
  );

  return stats;
}

function RadarChart({
  player,
  bench,
  size = 280,
}: {
  player: LineupPlayer;
  bench: Benchmarks;
  size?: number;
}) {
  const allStats = computeAllStats(player, bench);
  const metrics = [
    { label: 'NPI', value: allStats[1] },
    { label: 'Prev', value: allStats[16] },
    { label: 'Two-Way', value: allStats[26] },
    { label: 'Versat', value: allStats[28] },
    { label: 'MVP', value: allStats[35] },
    { label: 'Coach', value: allStats[50] },
  ];
  const angleStep = (Math.PI * 2) / metrics.length;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.42;

  const points = metrics
    .map((m, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (clamp(m.value) / 100) * radius;
      return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
    })
    .join(' ');

  return (
    <svg width={size} height={size} className="mx-auto drop-shadow-xl">
      {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
        <circle
          key={i}
          cx={centerX}
          cy={centerY}
          r={radius * ratio}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          opacity="0.3"
        />
      ))}
      {metrics.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={centerX + radius * Math.cos(angle)}
            y2={centerY + radius * Math.sin(angle)}
            stroke="#64748b"
            strokeWidth="1"
            opacity="0.4"
          />
        );
      })}
      <polygon points={points} fill="#22d3ee" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="3" />
      {metrics.map((m, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = (clamp(m.value) / 100) * radius;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="#22d3ee" />
            <text
              x={centerX + (radius + 22) * Math.cos(angle)}
              y={centerY + (radius + 22) * Math.sin(angle)}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="10"
              fontWeight="600"
            >
              {m.label}
            </text>
            <text
              x={centerX + (radius + 36) * Math.cos(angle)}
              y={centerY + (radius + 36) * Math.sin(angle)}
              textAnchor="middle"
              fill="#67e8f9"
              fontSize="13"
              fontWeight="700"
            >
              {Math.round(clamp(m.value))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MetricCard({
  title,
  value,
  trend,
  icon,
  gradient,
}: {
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-4xl font-black text-white tracking-tight">{value}</h3>
        </div>
        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">{icon}</div>
      </div>
      <p className="text-slate-500 text-sm mt-4 font-medium flex items-center">{trend}</p>
    </div>
  );
}

const NEXT_GEN_CATEGORIES: { key: NextGenCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'hitting', label: 'Hitting Value', icon: <Target className="w-4 h-4" /> },
  { key: 'pitching', label: 'Pitching Dominance', icon: <Shield className="w-4 h-4" /> },
  { key: 'twoway', label: 'Two-Way Stars', icon: <Award className="w-4 h-4" /> },
  { key: 'team', label: 'Team Insights', icon: <TeamIcon className="w-4 h-4" /> },
  { key: 'predictive', label: 'Predictive Engine', icon: <Sparkles className="w-4 h-4" /> },
];

export default function LineupIQClient({ teams, rosterByTeam, teamAggregates }: Props) {
  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    for (const t of teams) set.add(t.level);
    const ordered = Array.from(set);
    // Stable ordering: U-classes ascending, then class-years ascending.
    return ordered.sort((a, b) => {
      const au = a.match(/^(\d+)u$/);
      const bu = b.match(/^(\d+)u$/);
      if (au && bu) return parseInt(au[1], 10) - parseInt(bu[1], 10);
      if (au) return -1;
      if (bu) return 1;
      return a.localeCompare(b);
    });
  }, [teams]);

  const [activeLevel, setActiveLevel] = useState<string>(
    availableLevels[0] ?? '14u',
  );

  const teamsForLevel = useMemo(
    () => teams.filter((t) => t.level === activeLevel),
    [teams, activeLevel],
  );

  const [activeTeamId, setActiveTeamId] = useState<string>(teamsForLevel[0]?.id ?? '');
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);

  // Keep activeTeamId in sync when the level changes.
  const effectiveTeam =
    teamsForLevel.find((t) => t.id === activeTeamId) ?? teamsForLevel[0] ?? teams[0];

  const [activeTab, setActiveTab] = useState<'hitting' | 'pitching' | 'nextgen'>('hitting');
  const [activeNextGenCategory, setActiveNextGenCategory] =
    useState<NextGenCategory>('hitting');
  const [selectedPlayer, setSelectedPlayer] = useState<LineupPlayer | null>(null);
  const [exporting, setExporting] = useState(false);

  const bench = useMemo(() => benchmarksFor(activeLevel), [activeLevel]);

  const roster = effectiveTeam ? rosterByTeam[effectiveTeam.id] ?? [] : [];
  const agg = effectiveTeam ? teamAggregates[effectiveTeam.id] : undefined;

  const hittingLeader = roster[0] ?? null;
  const pitchingLeader = useMemo(() => {
    const pitchers = roster.filter((p) => p.hasPitched);
    return pitchers.sort((a, b) => parseFloat(a.era) - parseFloat(b.era))[0] ?? null;
  }, [roster]);

  const filteredNextGen = NEXT_GEN_STATS.filter((s) => s.category === activeNextGenCategory);

  async function handleExportPDF() {
    if (exporting || !effectiveTeam) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.setFontSize(24);
      pdf.setTextColor(30, 64, 175);
      pdf.text('LineupIQ — Next-Gen Baseball Intelligence', pageWidth / 2, 25, {
        align: 'center',
      });
      pdf.setFontSize(12);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `${prettyLevel(activeLevel)} • ${effectiveTeam.name} • Generated ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        35,
        { align: 'center' },
      );

      const element = document.getElementById('dashboard-main');
      if (element) {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#0f172a',
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 45, imgWidth, imgHeight);
      }

      pdf.save(
        `LineupIQ_${activeLevel}_${effectiveTeam.name.replace(/[^A-Za-z0-9]+/g, '')}.pdf`,
      );
    } finally {
      setExporting(false);
    }
  }

  if (!teams.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-2">LineupIQ</h1>
          <p className="text-slate-400 mb-4">
            No GameChanger data found yet. Run{' '}
            <code className="bg-slate-800 px-2 py-1 rounded text-xs">
              python scripts/gamechanger/sync.py
            </code>{' '}
            to populate the <code>gc_*</code> tables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white"
      id="dashboard-main"
    >
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="text-white h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Lineup<span className="font-light">IQ</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800 rounded-2xl p-1 border border-slate-700">
              {availableLevels.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setActiveLevel(lvl);
                    const first = teams.find((t) => t.level === lvl);
                    if (first) setActiveTeamId(first.id);
                  }}
                  className={`px-5 py-1.5 text-xs font-bold uppercase tracking-widest rounded-[14px] transition-all ${
                    activeLevel === lvl
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {prettyLevel(lvl)}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-2 rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/30"
            >
              <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export PDF'}
            </button>

            <div className="relative">
              <button
                onClick={() => setTeamPickerOpen((v) => !v)}
                className="bg-slate-800 hover:bg-slate-700 transition-colors rounded-lg px-4 py-2 flex items-center border border-slate-700"
              >
                <span className="font-medium mr-3">{effectiveTeam?.name ?? 'Select team'}</span>
                {effectiveTeam && (
                  <span className="text-blue-400 text-sm font-bold mr-2">
                    {effectiveTeam.record}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {teamPickerOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  {teamsForLevel.length === 0 && (
                    <div className="px-4 py-3 text-slate-400 text-sm">
                      No teams at {prettyLevel(activeLevel)}
                    </div>
                  )}
                  {teamsForLevel.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTeamId(t.id);
                        setTeamPickerOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center justify-between ${
                        t.id === effectiveTeam?.id ? 'bg-slate-800/60' : ''
                      }`}
                    >
                      <span className="text-sm text-slate-200">{t.name}</span>
                      <span className="text-xs font-bold text-blue-400">{t.record}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <MetricCard
            title="Team Batting Average"
            value={agg?.teamAvg ?? '.000'}
            trend={`${prettyLevel(activeLevel)} • ${effectiveTeam?.name ?? ''}`}
            icon={<TrendingUp className="text-emerald-400" />}
            gradient="from-emerald-900/40 to-slate-900"
          />
          <MetricCard
            title="Run Differential"
            value={agg?.runDiff?.split(' ')[0] ?? '+0'}
            trend={agg?.runDiff?.replace(/^[+\-\d]+\s*/, '') ?? '—'}
            icon={<Zap className="text-amber-400" />}
            gradient="from-amber-900/40 to-slate-900"
          />
          <MetricCard
            title="Staff ERA"
            value={agg?.staffEra ?? '—'}
            trend={agg?.ip ?? '—'}
            icon={<Crosshair className="text-blue-400" />}
            gradient="from-blue-900/40 to-slate-900"
          />
        </section>

        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-indigo-400" />
            Algorithmic Standouts{' '}
            <span className="ml-2 text-xs bg-indigo-500/10 text-indigo-400 px-3 py-px rounded-full">
              Normalized {prettyLevel(activeLevel)}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hittingLeader && (
              <div
                onClick={() => setSelectedPlayer(hittingLeader)}
                className="cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-xl hover:scale-[1.02] transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                    Offensive Juggernaut
                  </p>
                  <h3 className="text-2xl font-bold">
                    {hittingLeader.name}{' '}
                    <span className="text-slate-500 font-normal text-lg">
                      {hittingLeader.number}
                    </span>
                  </h3>
                  <p className="text-emerald-400 mt-1 text-sm">
                    NPI {Math.round(computeAllStats(hittingLeader, bench)[1])} • Coach Score{' '}
                    {Math.round(computeAllStats(hittingLeader, bench)[50])}
                  </p>
                </div>
                <div className="h-16 w-16 rounded-full border-[3px] border-indigo-500 flex items-center justify-center bg-indigo-500/10 text-indigo-300 font-black text-xl">
                  {Math.round(computeAllStats(hittingLeader, bench)[1])}
                </div>
              </div>
            )}

            {pitchingLeader && (
              <div
                onClick={() => setSelectedPlayer(pitchingLeader)}
                className="cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-xl hover:scale-[1.02] transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
                    Mound Ace
                  </p>
                  <h3 className="text-2xl font-bold">
                    {pitchingLeader.name}{' '}
                    <span className="text-slate-500 font-normal text-lg">
                      {pitchingLeader.number}
                    </span>
                  </h3>
                  <p className="text-sky-400 mt-1 text-sm">
                    Prevention {Math.round(computeAllStats(pitchingLeader, bench)[16])} • Coach Score{' '}
                    {Math.round(computeAllStats(pitchingLeader, bench)[50])}
                  </p>
                </div>
                <div className="h-16 w-16 rounded-full border-[3px] border-sky-500 flex items-center justify-center bg-sky-500/10 text-sky-300 font-black text-xl">
                  {Math.round(computeAllStats(pitchingLeader, bench)[16])}
                </div>
              </div>
            )}
          </div>
        </div>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="flex border-b border-slate-800">
            {(['hitting', 'pitching', 'nextgen'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600/10 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                {tab === 'nextgen' ? 'NEXT-GEN INTELLIGENCE' : tab}
              </button>
            ))}
          </div>

          {activeTab !== 'nextgen' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Player</th>
                    {activeTab === 'hitting' && (
                      <>
                        <th className="p-4 font-semibold text-right">AVG</th>
                        <th className="p-4 font-semibold text-right">OPS</th>
                        <th className="p-4 font-semibold text-right">HR</th>
                        <th className="p-4 font-semibold text-right">RBI</th>
                        <th className="p-4 font-semibold text-right">SB</th>
                      </>
                    )}
                    {activeTab === 'pitching' && (
                      <>
                        <th className="p-4 font-semibold text-right">ERA</th>
                        <th className="p-4 font-semibold text-right">IP</th>
                        <th className="p-4 font-semibold text-right">K</th>
                        <th className="p-4 font-semibold text-right">WHIP</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {(activeTab === 'pitching'
                    ? roster.filter((p) => p.hasPitched)
                    : roster
                  ).map((player) => (
                    <tr
                      key={player.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <td className="p-4 flex items-center">
                        <div className="h-8 w-8 rounded bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs mr-3 group-hover:bg-blue-900 group-hover:text-blue-300 transition-colors">
                          {player.number.replace('#', '')}
                        </div>
                        <span className="font-medium text-slate-200">{player.name}</span>
                      </td>
                      {activeTab === 'hitting' && (
                        <>
                          <td className="p-4 text-right font-mono text-slate-300">{player.avg}</td>
                          <td className="p-4 text-right font-mono font-bold text-blue-400">
                            {player.ops}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-300">{player.hr}</td>
                          <td className="p-4 text-right font-mono text-slate-300">{player.rbi}</td>
                          <td className="p-4 text-right font-mono text-slate-300">{player.sb}</td>
                        </>
                      )}
                      {activeTab === 'pitching' && (
                        <>
                          <td className="p-4 text-right font-mono font-bold text-sky-400">
                            {player.era}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-300">{player.ip}</td>
                          <td className="p-4 text-right font-mono text-slate-300">{player.so}</td>
                          <td className="p-4 text-right font-mono text-slate-300">
                            {player.whip}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'nextgen' && (
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700 pb-4">
                {NEXT_GEN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveNextGenCategory(cat.key)}
                    className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-2xl transition-all ${
                      activeNextGenCategory === cat.key
                        ? 'bg-white text-slate-900 shadow-inner'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNextGen.map((stat) => {
                  const player = hittingLeader;
                  if (!player) return null;
                  const all = computeAllStats(player, bench);
                  const value = all[stat.id] ?? 75;
                  const colorClass =
                    value > 85
                      ? 'text-emerald-400'
                      : value > 70
                      ? 'text-cyan-400'
                      : 'text-amber-400';
                  return (
                    <div
                      key={stat.id}
                      onClick={() => setSelectedPlayer(player)}
                      className="cursor-pointer bg-gradient-to-br from-slate-900/80 to-slate-800 border border-slate-700/50 rounded-3xl p-5 hover:scale-[1.02] transition-all group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-px">
                            {stat.category}
                          </p>
                          <h4 className="font-semibold leading-tight text-slate-100 group-hover:text-white">
                            {stat.name}
                          </h4>
                        </div>
                        <div className={`text-4xl font-black font-mono ${colorClass}`}>
                          {Math.round(clamp(value))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{stat.desc}</p>
                      <div className="text-[10px] font-mono bg-slate-900 px-3 py-1 rounded-2xl text-slate-400 w-fit">
                        {stat.formula}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-lg">
                  {selectedPlayer.number}
                </div>
                <div>
                  <h2 className="text-3xl font-bold">{selectedPlayer.name}</h2>
                  <p className="text-slate-400">
                    {prettyLevel(activeLevel)} • All 50 normalized stats • Live radar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-3 hover:bg-slate-800 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8">
              <RadarChart player={selectedPlayer} bench={bench} />
              <div className="mt-10 grid grid-cols-3 gap-6 text-center">
                <div className="bg-slate-800/50 rounded-3xl p-6">
                  <div className="text-emerald-400 text-5xl font-black font-mono">
                    {Math.round(computeAllStats(selectedPlayer, bench)[1])}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">NPI</div>
                </div>
                <div className="bg-slate-800/50 rounded-3xl p-6">
                  <div className="text-cyan-400 text-5xl font-black font-mono">
                    {Math.round(computeAllStats(selectedPlayer, bench)[16])}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">PREVENTION</div>
                </div>
                <div className="bg-slate-800/50 rounded-3xl p-6">
                  <div className="text-indigo-400 text-5xl font-black font-mono">
                    {Math.round(computeAllStats(selectedPlayer, bench)[50])}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">COACH SCORE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
