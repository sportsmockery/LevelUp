'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import {
  Brain, Target, TrendingUp, Zap, Download, Share2, Sparkles, Trophy,
  ChevronRight, Activity, Crosshair, Dumbbell,
} from 'lucide-react';
import { Glass, RedButton, GhostButton } from './ui';
import {
  type Position, type ToolGrades, type ScoutInput, type ScoutReport,
  type TrainInput, type TrainWeek, type PredictResult,
  SCOUT_PRESETS, runScoutAI, runTrainAI, runPredictAI, PREDICT_OPPONENTS, TEAMS,
} from './data';
import { cn } from '@/lib/utils';

type Tab = 'scout' | 'train' | 'predict';

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'scout', label: 'Scout AI', icon: Crosshair, desc: 'Instant prospect evaluation' },
  { id: 'train', label: 'Train AI', icon: Dumbbell, desc: 'Personalized development plan' },
  { id: 'predict', label: 'Predict AI', icon: Activity, desc: 'Matchup forecaster' },
];

export function IntelligenceHub({ id }: { id?: string }) {
  const [tab, setTab] = React.useState<Tab>('scout');

  return (
    <section id={id} className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            <Sparkles className="size-3.5 text-[#C8102E]" /> Intelligence Hub
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-bold leading-tight text-white sm:text-5xl">
            The most advanced youth baseball{' '}
            <span className="text-[#C8102E]">intelligence platform</span> in the country
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/60">
            Three AI engines built into every UDC experience — evaluate prospects, generate
            development plans, and forecast matchups. Try a live demo below.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-300',
                  active
                    ? 'border-[#C8102E] bg-[#C8102E]/10 shadow-[0_8px_30px_-10px_rgba(200,16,46,0.6)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                )}
              >
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                    active ? 'bg-[#C8102E] text-white' : 'bg-white/10 text-white/70'
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">{t.label}</span>
                  <span className="block text-xs text-white/50">{t.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Panels */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              {tab === 'scout' && <ScoutPanel />}
              {tab === 'train' && <TrainPanel />}
              {tab === 'predict' && <PredictPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SCOUT AI
// ============================================================================
const TOOL_KEYS: { key: keyof ToolGrades; label: string }[] = [
  { key: 'hit', label: 'Hit' },
  { key: 'power', label: 'Power' },
  { key: 'speed', label: 'Speed' },
  { key: 'arm', label: 'Arm' },
  { key: 'field', label: 'Field' },
  { key: 'iq', label: 'Baseball IQ' },
];

const POSITIONS: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'P'];
const AGE_GROUPS = ['10U', '12U', '14U', '16U', '17U'];

function ScoutPanel() {
  const [input, setInput] = React.useState<ScoutInput>(SCOUT_PRESETS[0].input);
  const [report, setReport] = React.useState<ScoutReport | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadStep, setLoadStep] = React.useState(0);

  const LOAD_STEPS = ['Ingesting tool grades…', 'Comparing vs age-group database…', 'Modeling projection curve…', 'Generating scouting report…'];

  function analyze() {
    setLoading(true);
    setReport(null);
    setLoadStep(0);
    const stepInt = setInterval(() => setLoadStep((s) => Math.min(s + 1, LOAD_STEPS.length - 1)), 460);
    setTimeout(() => {
      clearInterval(stepInt);
      setReport(runScoutAI(input));
      setLoading(false);
    }, 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      {/* Inputs */}
      <Glass className="p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-white">
          <Crosshair className="size-5 text-[#C8102E]" /> Build a Prospect
        </h3>
        <p className="mt-1 text-sm text-white/50">Load a preset or dial in the tools.</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {SCOUT_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { setInput(p.input); setReport(null); }}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-[#C8102E] hover:text-white"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Field label="Age Group">
            <Select
              value={input.ageGroup}
              onChange={(v) => setInput((s) => ({ ...s, ageGroup: v }))}
              options={AGE_GROUPS}
            />
          </Field>
          <Field label="Position">
            <Select
              value={input.position}
              onChange={(v) => setInput((s) => ({ ...s, position: v as Position }))}
              options={POSITIONS}
            />
          </Field>
        </div>

        <div className="mt-6 space-y-4">
          {TOOL_KEYS.map(({ key, label }) => (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-white/80">{label}</span>
                <span className="font-mono font-bold text-[#C8102E]">{input.tools[key]}</span>
              </div>
              <input
                type="range"
                min={40}
                max={99}
                value={input.tools[key]}
                onChange={(e) =>
                  setInput((s) => ({ ...s, tools: { ...s.tools, [key]: Number(e.target.value) } }))
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#C8102E]"
                style={{
                  background: `linear-gradient(90deg, #C8102E ${((input.tools[key] - 40) / 59) * 100}%, rgba(255,255,255,0.15) ${((input.tools[key] - 40) / 59) * 100}%)`,
                }}
              />
            </div>
          ))}
        </div>

        <RedButton className="mt-7 w-full" onClick={analyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze with Scout AI'}
          {!loading && <Brain className="size-4" />}
        </RedButton>
      </Glass>

      {/* Output */}
      <Glass className="min-h-[520px] p-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[460px] flex-col items-center justify-center">
              <div className="relative size-16">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#C8102E]" />
                <Brain className="absolute inset-0 m-auto size-7 text-[#C8102E]" />
              </div>
              <div className="mt-6 h-5 text-sm font-medium text-white/70">{LOAD_STEPS[loadStep]}</div>
              <div className="mt-3 flex gap-1.5">
                {LOAD_STEPS.map((_, i) => (
                  <div key={i} className={cn('h-1 w-8 rounded-full transition-colors', i <= loadStep ? 'bg-[#C8102E]' : 'bg-white/15')} />
                ))}
              </div>
            </motion.div>
          ) : report ? (
            <ScoutReportCard key="report" report={report} input={input} />
          ) : (
            <motion.div key="empty" className="flex h-full min-h-[460px] flex-col items-center justify-center text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5">
                <Crosshair className="size-8 text-white/30" />
              </div>
              <p className="mt-5 max-w-xs text-sm text-white/40">
                Configure the prospect on the left and run Scout AI to generate a full scouting report card.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>
    </div>
  );
}

function ScoutReportCard({ report, input }: { report: ScoutReport; input: ScoutInput }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">
            Scout AI · {input.ageGroup} {input.position}
          </div>
          <h3 className="mt-1 font-heading text-2xl font-bold text-white">Scouting Report Card</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="font-heading text-4xl font-bold leading-none text-white">{report.overall}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Overall</div>
          </div>
          <div className="flex size-14 flex-col items-center justify-center rounded-xl bg-[#C8102E] text-white">
            <Trophy className="size-5" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {/* Radar */}
        <div className="rounded-xl border border-white/10 bg-[#081325]/60 p-3">
          <div className="mb-1 text-xs font-semibold text-white/60">Tool Grades vs Age Average</div>
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={report.radar} outerRadius="72%">
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="tool" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
              <Radar name="League Avg" dataKey="league" stroke="rgba(255,255,255,0.35)" fill="rgba(255,255,255,0.08)" fillOpacity={0.6} />
              <Radar name="Prospect" dataKey="value" stroke="#C8102E" fill="#C8102E" fillOpacity={0.45} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade + ceiling */}
        <div className="space-y-3">
          <MetricRow icon={Target} label="Recruiting Grade" value={report.recruitingGrade} />
          <MetricRow icon={TrendingUp} label="Projected Ceiling" value={report.ceiling} />
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-white/70">Projection Confidence</span>
              <span className="font-bold text-[#10B981]">{report.ceilingPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#C8102E] to-[#10B981]"
                initial={{ width: 0 }}
                animate={{ width: `${report.ceilingPct}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-1 text-xs font-semibold text-white/70">Comparable Profiles</div>
            <div className="flex flex-wrap gap-1.5">
              {report.comps.map((c) => (
                <span key={c} className="rounded-full bg-[#C8102E]/15 px-2.5 py-1 text-[11px] font-medium text-white/90">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Strengths & priorities */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#10B981]/25 bg-[#10B981]/[0.06] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#10B981]">
            <Zap className="size-4" /> Strengths
          </div>
          <ul className="space-y-2">
            {report.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-white/75"><ChevronRight className="mt-0.5 size-4 shrink-0 text-[#10B981]" />{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[#C8102E]/25 bg-[#C8102E]/[0.06] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#C8102E]">
            <Target className="size-4" /> Development Priorities
          </div>
          <ul className="space-y-2">
            {report.priorities.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-white/75"><ChevronRight className="mt-0.5 size-4 shrink-0 text-[#C8102E]" />{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/70">
        {report.summary}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <RedButton className="px-5 py-2.5 text-xs" onClick={() => alert('Demo: PDF report export would download here.')}>
          <Download className="size-4" /> Download PDF Report
        </RedButton>
        <GhostButton className="px-5 py-2.5 text-xs" onClick={() => alert('Demo: shareable profile link copied.')}>
          <Share2 className="size-4" /> Share Profile
        </GhostButton>
      </div>
    </motion.div>
  );
}

function MetricRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-[#C8102E]/15 text-[#C8102E]"><Icon className="size-4.5" /></span>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</div>
        <div className="text-sm font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}

// ============================================================================
// TRAIN AI
// ============================================================================
function TrainPanel() {
  const [input, setInput] = React.useState<TrainInput>({ position: 'SS', focus: 'Hitting', weeks: 6 });
  const [plan, setPlan] = React.useState<TrainWeek[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  function generate() {
    setLoading(true);
    setPlan(null);
    setTimeout(() => { setPlan(runTrainAI(input)); setLoading(false); }, 1400);
  }

  const focuses: TrainInput['focus'][] = ['Hitting', 'Power', 'Speed', 'Defense', 'Pitching'];

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Glass className="p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-white">
          <Dumbbell className="size-5 text-[#C8102E]" /> Build a Plan
        </h3>
        <p className="mt-1 text-sm text-white/50">Generate a personalized development block.</p>

        <div className="mt-6">
          <Field label="Position">
            <Select value={input.position} onChange={(v) => setInput((s) => ({ ...s, position: v as Position }))} options={POSITIONS} />
          </Field>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Focus Area</div>
          <div className="flex flex-wrap gap-2">
            {focuses.map((f) => (
              <button
                key={f}
                onClick={() => setInput((s) => ({ ...s, focus: f }))}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  input.focus === f ? 'bg-[#C8102E] text-white' : 'border border-white/15 bg-white/5 text-white/70 hover:text-white'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-white/80">Program Length</span>
            <span className="font-mono font-bold text-[#C8102E]">{input.weeks} weeks</span>
          </div>
          <input
            type="range" min={4} max={6} value={input.weeks}
            onChange={(e) => setInput((s) => ({ ...s, weeks: Number(e.target.value) }))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#C8102E]"
            style={{ background: `linear-gradient(90deg, #C8102E ${((input.weeks - 4) / 2) * 100}%, rgba(255,255,255,0.15) ${((input.weeks - 4) / 2) * 100}%)` }}
          />
        </div>

        <RedButton className="mt-7 w-full" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate Plan'}
          {!loading && <Sparkles className="size-4" />}
        </RedButton>
      </Glass>

      <Glass className="min-h-[460px] p-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[400px] items-center justify-center">
              <div className="relative size-14">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#C8102E] border-white/10" />
                <Dumbbell className="absolute inset-0 m-auto size-6 text-[#C8102E]" />
              </div>
            </motion.div>
          ) : plan ? (
            <motion.div key="p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">Train AI · {input.focus}</div>
                  <h3 className="mt-1 font-heading text-xl font-bold text-white">{input.weeks}-Week Development Plan · {input.position}</h3>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.map((w, i) => (
                  <motion.div
                    key={w.week}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-[#C8102E] text-xs font-bold text-white">{w.week}</span>
                      <span className="text-sm font-bold text-white">{w.theme}</span>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {w.blocks.map((b) => (
                        <li key={b} className="flex gap-2 text-[13px] text-white/65"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#C8102E]" />{b}</li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="e" className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5"><Dumbbell className="size-8 text-white/30" /></div>
              <p className="mt-5 max-w-xs text-sm text-white/40">Choose a position, focus area, and length, then generate a week-by-week plan.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>
    </div>
  );
}

// ============================================================================
// PREDICT AI
// ============================================================================
function PredictPanel() {
  const [teamId, setTeamId] = React.useState(TEAMS.find((t) => t.spotlight)?.id ?? TEAMS[0].id);
  const [opp, setOpp] = React.useState(PREDICT_OPPONENTS[0]);
  const [result, setResult] = React.useState<PredictResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  function predict() {
    setLoading(true);
    setResult(null);
    setTimeout(() => { setResult(runPredictAI(teamId, opp)); setLoading(false); }, 1500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Glass className="p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-white">
          <Activity className="size-5 text-[#C8102E]" /> Forecast a Matchup
        </h3>
        <p className="mt-1 text-sm text-white/50">Project the outcome of an upcoming game.</p>

        <div className="mt-6 space-y-5">
          <Field label="UDC Team">
            <Select value={teamId} onChange={setTeamId} options={TEAMS.map((t) => t.id)} labels={Object.fromEntries(TEAMS.map((t) => [t.id, t.name]))} />
          </Field>
          <Field label="Opponent">
            <Select value={opp} onChange={setOpp} options={PREDICT_OPPONENTS} />
          </Field>
        </div>

        <RedButton className="mt-7 w-full" onClick={predict} disabled={loading}>
          {loading ? 'Modeling…' : 'Run Prediction'}
          {!loading && <Activity className="size-4" />}
        </RedButton>
      </Glass>

      <Glass className="min-h-[460px] p-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[400px] items-center justify-center">
              <div className="relative size-14">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#C8102E] border-white/10" />
                <Activity className="absolute inset-0 m-auto size-6 text-[#C8102E]" />
              </div>
            </motion.div>
          ) : result ? (
            <motion.div key="r" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">Predict AI · Game Forecast</div>
              <h3 className="mt-1 font-heading text-xl font-bold text-white">
                {TEAMS.find((t) => t.id === teamId)?.name} vs {opp}
              </h3>

              <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <WinDial label="UDC Win Prob." pct={result.winPct} accent="#C8102E" />
                <div className="text-center">
                  <div className="font-heading text-3xl font-bold text-white">{result.projScore.us}–{result.projScore.them}</div>
                  <div className="text-[11px] uppercase tracking-wider text-white/45">Proj. Score</div>
                  <div className="mt-2 inline-block rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/70">{result.confidence} confidence</div>
                </div>
                <WinDial label={`${opp} Win Prob.`} pct={100 - result.winPct} accent="#64748B" />
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 text-sm font-bold text-white">Key Factors</div>
                <ul className="space-y-2">
                  {result.keyFactors.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-white/70"><ChevronRight className="mt-0.5 size-4 shrink-0 text-[#C8102E]" />{f}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#C8102E]/25 bg-[#C8102E]/[0.06] p-4">
                <Zap className="mt-0.5 size-5 shrink-0 text-[#C8102E]" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#C8102E]">X-Factor</div>
                  <div className="text-sm text-white/80">{result.xFactor}</div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="e" className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5"><Activity className="size-8 text-white/30" /></div>
              <p className="mt-5 max-w-xs text-sm text-white/40">Pick a UDC team and an opponent to forecast win probability and a projected score.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>
    </div>
  );
}

function WinDial({ label, pct, accent }: { label: string; pct: number; accent: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative size-28">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * pct) / 100 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-heading text-2xl font-bold text-white">{pct}%</div>
      </div>
      <div className="mt-2 text-center text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}

// ============================================================================
// Shared form bits
// ============================================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/45">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value, onChange, options, labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-white/15 bg-[#081325] px-3.5 py-2.5 text-sm font-medium text-white outline-none transition focus:border-[#C8102E]"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#081325] text-white">{labels?.[o] ?? o}</option>
        ))}
      </select>
      <ChevronRight className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 rotate-90 text-white/40" />
    </div>
  );
}
