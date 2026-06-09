'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, ResponsiveContainer, YAxis, Tooltip,
} from 'recharts';
import {
  Menu, X, ChevronRight, ArrowRight, MapPin, Calendar, Trophy, Users,
  TrendingUp, Brain, Quote, Star, Shield, Target, Gauge, ChevronLeft,
} from 'lucide-react';
import { Glass, RedButton, GhostButton, Reveal, HittersLogo, StatNumber, SectionEyebrow, Photo, PlayerAvatar, BaseballIcon } from './ui';
import { PLAYERS, TEAMS, GAMES, TRYOUTS, NEWS, TESTIMONIALS, type Player, type Team } from './data';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Teams', href: '#teams' },
  { label: 'Intelligence Hub', href: '#intelligence' },
  { label: 'Schedule', href: '#schedule' },
  { label: 'Development', href: '#development' },
  { label: 'Tryouts', href: '#tryouts' },
  { label: 'News', href: '#news' },
];

// ============================================================================
// NAVBAR
// ============================================================================
export function Navbar({ onLaunch }: { onLaunch: () => void }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-2xl' : 'bg-transparent'
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <a href="#top" aria-label="Hitters Baseball home"><HittersLogo className="h-12" /></a>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <RedButton className="hidden px-4 py-2.5 text-xs sm:inline-flex" onClick={onLaunch}>
            <BaseballIcon className="size-4" /> Launch Scout AI
          </RedButton>
          <button
            className="rounded-lg p-2 text-white lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-[#0A0A0A]/95 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-white/80 transition hover:bg-white/5"
                >
                  {l.label}
                </a>
              ))}
              <RedButton className="mt-2 w-full" onClick={() => { setOpen(false); onLaunch(); }}>
                <BaseballIcon className="size-4" /> Launch Scout AI
              </RedButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ============================================================================
// HERO
// ============================================================================
export function Hero({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden pt-20">
      {/* Optional real team photo backdrop — drop file at public/team/hero.jpg */}
      <div className="pointer-events-none absolute inset-0">
        <Photo
          src="/team/hero.jpg"
          alt="Upper Deck Cougars team"
          className="absolute inset-0 size-full object-cover opacity-[0.22] grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/85 to-[#0A0A0A]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/60" />
      </div>
      {/* Background gradient + glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 size-[520px] rounded-full bg-[#C9CDD2]/20 blur-[140px]" />
        <div className="absolute -right-40 bottom-0 size-[520px] rounded-full bg-[#3A3A3D]/15 blur-[140px]" />
        <div className="hitters-grid absolute inset-0 opacity-[0.5]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-xl">
            <Star className="size-3.5 text-[#C9CDD2]" /> Chicagoland&apos;s Premier Travel Club · Est. 1992
          </span>

          <h1 className="mt-6 font-heading text-5xl font-bold leading-[1.04] text-white sm:text-6xl lg:text-7xl">
            Blue-Collar Grit.
            <br />
            <span className="h-chrome-text">AI-Powered</span> Intelligence.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
            Upper Deck Cougars develop elite ballplayers the right way — relentless work ethic
            meets the most advanced player-development technology in youth baseball.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <RedButton className="px-7 py-3.5 text-base" onClick={onLaunch}>
              <BaseballIcon className="size-5" /> Launch Scout AI
            </RedButton>
            <GhostButton className="px-7 py-3.5 text-base" onClick={() => document.getElementById('tryouts')?.scrollIntoView({ behavior: 'smooth' })}>
              View 2026 Tryouts <ArrowRight className="size-4" />
            </GhostButton>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold uppercase tracking-wider text-white/45">
            <span>Est. 1992</span><Dot /><span>30+ Years of Development</span><Dot />
            <span>500+ College Commitments</span><Dot /><span>National Championship Pedigree</span>
          </div>
        </motion.div>

        {/* Hero card — live "Scout AI" preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <Glass className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#C9CDD2]">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#C9CDD2] opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-[#C9CDD2]" /></span>
                Scout AI · Live
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">14U · SS</span>
            </div>

            <div className="mt-5 flex items-end justify-between">
              <div>
                <div className="text-sm text-white/55">Marcus Delgado</div>
                <div className="font-heading text-4xl font-bold text-white">91<span className="text-lg text-white/40"> / 100</span></div>
              </div>
              <div className="rounded-xl bg-[#E6E8EB]/15 px-3 py-1.5 text-xs font-bold text-[#E6E8EB]">▲ +18% efficiency</div>
            </div>

            <div className="mt-5 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PLAYERS[0].trend}>
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Line type="monotone" dataKey="ev" stroke="#C9CDD2" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-white/40">Max Exit Velocity · 5-month trend</div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[['Hit', 78], ['Speed', 82], ['Field', 84]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
                  <div className="font-heading text-xl font-bold text-white">{v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/45">{k}</div>
                </div>
              ))}
            </div>
          </Glass>
          <div className="absolute -bottom-4 -right-4 -z-10 size-32 rounded-full bg-[#C9CDD2]/30 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
}

function Dot() { return <span className="size-1 rounded-full bg-white/30" />; }

// ============================================================================
// ABOUT + STATS
// ============================================================================
const STATS = [
  { value: 30, suffix: '+', label: 'Years Developing Players' },
  { value: 6, suffix: '', label: 'Age-Group Teams' },
  { value: 500, suffix: '+', label: 'College Commitments' },
  { value: 100, suffix: '%', label: 'AI-Powered Development' },
];

export function About() {
  return (
    <section id="about" className="relative py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>Since 1992</SectionEyebrow>
          <h2 className="mt-6 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
            We build ballplayers and people — through hard work, discipline, and
            the smartest development tools in the game.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/60">
            Rooted in Chicagoland&apos;s south suburbs, Upper Deck Cougars is a blue-collar baseball
            family. We develop elite talent while instilling teamwork, accountability, and respect
            for the grind — now supercharged by AI-driven player intelligence.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <Glass className="p-6 text-center" hover>
                <div className="font-heading text-4xl font-bold text-[#C9CDD2] sm:text-5xl">
                  <StatNumber value={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/55">{s.label}</div>
              </Glass>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TEAMS
// ============================================================================
export function Teams() {
  const [active, setActive] = React.useState<Team | null>(null);
  const spotlight = TEAMS.find((t) => t.spotlight);
  const rest = TEAMS.filter((t) => !t.spotlight);

  return (
    <section id="teams" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal className="max-w-2xl">
          <SectionEyebrow>Our Program</SectionEyebrow>
          <h2 className="mt-6 font-heading text-3xl font-bold text-white sm:text-4xl">Teams built to compete — and develop</h2>
          <p className="mt-4 text-base text-white/60">From 8U to 17U, every Cougars team trains with the same standard: grind on the field, intelligence behind it.</p>
        </Reveal>

        {/* Spotlight */}
        {spotlight && (
          <Reveal className="mt-12">
            <Glass className="overflow-hidden">
              <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_1fr] lg:p-10">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black">
                    <Star className="size-3" /> Flagship Team
                  </span>
                  <h3 className="mt-4 font-heading text-3xl font-bold text-white">{spotlight.name}</h3>
                  <p className="mt-2 text-white/60">{spotlight.coach} · {spotlight.highlight}</p>
                  <div className="mt-6 flex flex-wrap gap-6">
                    <Metric label="Record" value={spotlight.record} />
                    <Metric label="AI Team Grade" value={String(spotlight.aiGrade)} accent />
                    <Metric label="Roster" value={`${spotlight.roster.length} listed`} />
                  </div>
                  <RedButton className="mt-7 px-5 py-2.5 text-xs" onClick={() => setActive(spotlight)}>
                    <Users className="size-4" /> View Roster & AI Insights
                  </RedButton>
                </div>
                <div className="grid grid-cols-2 gap-3 self-center">
                  {[['Barrel %', 'Top 8%'], ['Team OPS', '.948'], ['Fielding %', '.971'], ['Tournaments', '11']].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-white/10 bg-[#141416]/60 p-4 text-center">
                      <div className="font-heading text-2xl font-bold text-white">{v}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wider text-white/45">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Glass>
          </Reveal>
        )}

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.06}>
              <Glass className="flex h-full flex-col p-6" hover>
                <div className="flex items-center justify-between">
                  <span className="font-heading text-2xl font-bold text-white">{t.age}</span>
                  <span className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', gradeColor(t.aiGrade))}>AI {t.aiGrade}</span>
                </div>
                <div className="mt-3 text-sm font-semibold text-white">{t.name}</div>
                <div className="text-sm text-white/50">{t.coach} · {t.record}</div>
                <p className="mt-3 flex-1 text-sm text-white/60">{t.highlight}</p>
                <button
                  onClick={() => setActive(t)}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C9CDD2] transition hover:gap-2"
                >
                  View Roster <ChevronRight className="size-4" />
                </button>
              </Glass>
            </Reveal>
          ))}
        </div>
      </div>

      <RosterModal team={active} onClose={() => setActive(null)} />
    </section>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={cn('font-heading text-2xl font-bold', accent ? 'text-[#C9CDD2]' : 'text-white')}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-white/45">{label}</div>
    </div>
  );
}

function gradeColor(g: number) {
  if (g >= 90) return 'bg-[#E6E8EB]/15 text-[#E6E8EB]';
  if (g >= 84) return 'bg-[#C9CDD2]/15 text-[#C9CDD2]';
  return 'bg-white/10 text-white/70';
}

function RosterModal({ team, onClose }: { team: Team | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {team && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
            className="relative w-full max-w-lg"
          >
            <Glass className="p-7">
              <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><X className="size-5" /></button>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#C9CDD2]">{team.age} · AI Grade {team.aiGrade}</div>
              <h3 className="mt-1 font-heading text-2xl font-bold text-white">{team.name}</h3>
              <p className="mt-1 text-sm text-white/55">{team.coach} · {team.record} · {team.highlight}</p>

              <div className="mt-6 space-y-2">
                {team.roster.map((p) => (
                  <div key={p.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#C9CDD2]/15 text-xs font-bold text-[#C9CDD2]">{p.pos}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                      <div className="truncate text-xs text-white/50">{p.note}</div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-white/40">&apos;{String(p.grad).slice(2)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#C9CDD2]/25 bg-[#C9CDD2]/[0.06] p-3.5">
                <Brain className="mt-0.5 size-4.5 shrink-0 text-[#C9CDD2]" />
                <p className="text-xs leading-relaxed text-white/70">
                  <span className="font-semibold text-white">AI Insight:</span> This group grades in the upper tier for its age,
                  driven by quality at-bats and defensive efficiency. Continued strength gains project additional game power.
                </p>
              </div>
            </Glass>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// FEATURED PLAYERS
// ============================================================================
export function FeaturedPlayers() {
  const [active, setActive] = React.useState<Player | null>(null);
  const scroller = React.useRef<HTMLDivElement>(null);

  function scroll(dir: number) {
    scroller.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }

  return (
    <section id="players" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex items-end justify-between gap-4">
          <Reveal>
            <SectionEyebrow>Player Spotlight</SectionEyebrow>
            <h2 className="mt-6 font-heading text-3xl font-bold text-white sm:text-4xl">Featured players & AI insights</h2>
            <p className="mt-4 max-w-xl text-base text-white/60">Every athlete is tracked, measured, and developed with data. Tap a card for the full AI breakdown.</p>
          </Reveal>
          <div className="hidden gap-2 sm:flex">
            <button onClick={() => scroll(-1)} className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white transition hover:bg-white/10"><ChevronLeft className="size-5" /></button>
            <button onClick={() => scroll(1)} className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white transition hover:bg-white/10"><ChevronRight className="size-5" /></button>
          </div>
        </div>

        <div ref={scroller} className="hitters-scroll mt-10 flex snap-x gap-4 overflow-x-auto pb-4">
          {PLAYERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className="group w-[280px] shrink-0 snap-start text-left"
            >
              <Glass className="h-full p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/20" >
                <div className="flex items-center justify-between">
                  <PlayerAvatar id={p.id} name={p.name} number={p.number} className="size-14 rounded-2xl" textClassName="text-xl" />
                  <span className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', gradeColor(p.aiGrade))}>AI {p.aiGrade}</span>
                </div>
                <div className="mt-4 text-base font-bold text-white">{p.name}</div>
                <div className="text-sm text-white/50">#{p.number} · {p.position} · Class of &apos;{String(p.gradYear).slice(2)}</div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="AVG" value={p.avg.toFixed(3).replace(/^0/, '')} />
                  <MiniStat label="Max EV" value={`${p.exitVeloMax}`} />
                  <MiniStat label="60yd" value={p.sixtyYard.toFixed(2)} />
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <TrendingUp className="mt-0.5 size-4 shrink-0 text-[#E6E8EB]" />
                  <p className="text-xs leading-snug text-white/65">{p.insight}</p>
                </div>
              </Glass>
            </button>
          ))}
        </div>
      </div>

      <PlayerModal player={active} onClose={() => setActive(null)} />
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#141416]/50 py-2">
      <div className="font-heading text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}

function PlayerModal({ player, onClose }: { player: Player | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {player && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }} className="relative w-full max-w-xl">
            <Glass className="p-7">
              <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><X className="size-5" /></button>
              <div className="flex items-center gap-4">
                <PlayerAvatar id={player.id} name={player.name} number={player.number} className="size-16 shrink-0 rounded-2xl" textClassName="text-2xl" />
                <div>
                  <h3 className="font-heading text-2xl font-bold text-white">#{player.number} {player.name}</h3>
                  <div className="text-sm text-white/55">{player.position} · {player.team} · Class of {player.gradYear}</div>
                  <div className="mt-1 text-xs text-white/45">{player.height} · B/T: {player.bats}/{player.throws} · Age {player.age}</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {([['AVG', player.avg.toFixed(3).replace(/^0/, '')], ['OBP', player.obp.toFixed(3).replace(/^0/, '')], ['OPS', player.ops.toFixed(3)], ['Max EV', `${player.exitVeloMax}`], ['60yd', player.sixtyYard.toFixed(2)], ['AI', `${player.aiGrade}`]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/10 bg-[#141416]/50 py-3 text-center">
                    <div className="font-heading text-lg font-bold text-white">{v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{k}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Max Exit Velocity Trend</div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={player.trend} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                      <YAxis domain={['dataMin - 3', 'dataMax + 3']} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#fff' }} />
                      <Line type="monotone" dataKey="ev" stroke="#C9CDD2" strokeWidth={3} dot={{ fill: '#C9CDD2', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#C9CDD2]/25 bg-[#C9CDD2]/[0.06] p-4">
                <Brain className="mt-0.5 size-5 shrink-0 text-[#C9CDD2]" />
                <p className="text-sm leading-relaxed text-white/75"><span className="font-semibold text-white">LevelUp Scout AI:</span> {player.insight}</p>
              </div>
            </Glass>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// SCHEDULE
// ============================================================================
export function Schedule() {
  const ages = ['All', ...Array.from(new Set(GAMES.map((g) => g.ageGroup)))];
  const [filter, setFilter] = React.useState('All');
  const [preview, setPreview] = React.useState<string | null>(null);
  const games = GAMES.filter((g) => filter === 'All' || g.ageGroup === filter);

  return (
    <section id="schedule" className="relative py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="max-w-2xl">
          <SectionEyebrow>Schedule & Results</SectionEyebrow>
          <h2 className="mt-6 font-heading text-3xl font-bold text-white sm:text-4xl">On the field, every weekend</h2>
        </Reveal>

        <div className="mt-8 flex flex-wrap gap-2">
          {ages.map((a) => (
            <button
              key={a}
              onClick={() => setFilter(a)}
              className={cn('rounded-full px-4 py-1.5 text-xs font-semibold transition', filter === a ? 'bg-white text-black' : 'border border-white/15 bg-white/5 text-white/70 hover:text-white')}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {games.map((g, i) => (
            <Reveal key={g.id} delay={i * 0.04}>
              <Glass className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" hover>
                <div className="flex items-center gap-4">
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9CDD2]">{g.date.split(' ')[0]}</div>
                    <div className="font-heading text-2xl font-bold leading-none text-white">{g.date.split(' ')[1].replace(',', '')}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">{g.ageGroup}</span>
                      <span className="text-sm font-bold text-white">vs {g.opponent}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-white/45">
                      <span className="flex items-center gap-1"><Trophy className="size-3" />{g.tournament}</span>
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{g.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:justify-end">
                  {g.status === 'final' && g.result ? (
                    <span className={cn('rounded-lg px-3 py-1.5 text-sm font-bold', g.result.win ? 'bg-[#E6E8EB]/15 text-[#E6E8EB]' : 'bg-white/10 text-white/60')}>
                      {g.result.win ? 'W' : 'L'} {g.result.us}–{g.result.them}
                    </span>
                  ) : (
                    <button
                      onClick={() => setPreview(preview === g.id ? null : g.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9CDD2]/40 bg-[#C9CDD2]/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#C9CDD2]/20"
                    >
                      <Brain className="size-3.5" /> AI Game Preview
                    </button>
                  )}
                </div>
              </Glass>
              <AnimatePresence>
                {preview === g.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-[#C9CDD2]/25 bg-[#C9CDD2]/[0.06] p-4">
                      <Brain className="mt-0.5 size-4.5 shrink-0 text-[#C9CDD2]" />
                      <p className="text-sm leading-relaxed text-white/75">
                        <span className="font-semibold text-white">Key Matchup Insight:</span> {g.ageGroup} projects with a favorable barrel-rate edge.
                        Win the early innings with quality at-bats and the model gives UDC a strong advantage. Watch the bullpen depth in the middle frames.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// DEVELOPMENT
// ============================================================================
const PILLARS = [
  { icon: Shield, title: 'Blue-Collar Foundation', body: 'Discipline, accountability, and relentless reps. We out-work everyone — that never changes.' },
  { icon: Gauge, title: 'Data-Driven Training', body: 'Exit velo, bat speed, spin rate, and swing efficiency tracked every session to target real gains.' },
  { icon: Brain, title: 'AI Development Plans', body: 'Every athlete gets a personalized, AI-generated plan that evolves with their measured progress.' },
  { icon: Target, title: 'Recruiting & Showcases', body: 'PBR & Perfect Game exposure, college placement support, and showcase preparation.' },
];

export function Development() {
  return (
    <section id="development" className="relative py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="max-w-2xl">
          <SectionEyebrow>Development Philosophy</SectionEyebrow>
          <h2 className="mt-6 font-heading text-3xl font-bold text-white sm:text-4xl">Old-school grind. New-school intelligence.</h2>
          <p className="mt-4 text-base text-white/60">What makes UDC different is the blend: the toughness of traditional baseball with player-development technology no other youth program in the country can match.</p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={i * 0.07}>
                <Glass className="flex h-full gap-4 p-6" hover>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#C9CDD2]/15 text-[#C9CDD2]"><Icon className="size-6" /></span>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-white">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/60">{p.body}</p>
                  </div>
                </Glass>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TRYOUTS
// ============================================================================
export function Tryouts() {
  return (
    <section id="tryouts" className="relative py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Glass className="relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[#C9CDD2]/20 blur-[100px]" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <SectionEyebrow>2026 Tryouts</SectionEyebrow>
              <h2 className="mt-6 font-heading text-3xl font-bold text-white sm:text-4xl">Join the family</h2>
              <p className="mt-4 text-base text-white/60">
                Earn your spot with Chicagoland&apos;s premier travel program. Every tryout includes an
                AI-powered evaluation — you&apos;ll leave with real data on where you stand and what to work on.
              </p>

              <div className="mt-6 space-y-3">
                {['Full skills evaluation (hit, run, throw, field)', 'AI metrics: exit velo, 60-yard, pop/arm', 'Same-day feedback from UDC coaching staff', 'Private & make-up tryouts available on request'].map((s) => (
                  <div key={s} className="flex items-center gap-2.5 text-sm text-white/75">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#C9CDD2]/20"><ChevronRight className="size-3 text-[#C9CDD2]" /></span>
                    {s}
                  </div>
                ))}
              </div>

              <RedButton className="mt-8 px-7 py-3.5 text-base" onClick={() => alert('Demo: registration form would open here.')}>
                Register for Tryouts <ArrowRight className="size-5" />
              </RedButton>
            </div>

            <div className="space-y-3">
              {TRYOUTS.map((t, i) => (
                <Reveal key={t.age} delay={i * 0.06}>
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#141416]/60 p-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#C9CDD2]/15 text-[#C9CDD2]"><Calendar className="size-6" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-heading text-base font-bold text-white">{t.age}</div>
                      <div className="text-sm text-white/55">{t.date} · {t.time}</div>
                      <div className="flex items-center gap-1 text-xs text-white/40"><MapPin className="size-3" />{t.location}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Glass>
      </div>
    </section>
  );
}

// ============================================================================
// NEWS + TESTIMONIALS
// ============================================================================
export function News() {
  return (
    <section id="news" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal className="max-w-2xl">
          <SectionEyebrow>News & Community</SectionEyebrow>
          <h2 className="mt-6 font-heading text-3xl font-bold text-white sm:text-4xl">From the Cougars family</h2>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {NEWS.map((n, i) => (
            <Reveal key={n.title} delay={i * 0.06}>
              <Glass className="flex h-full flex-col p-6" hover>
                <span className="w-fit rounded-full bg-[#C9CDD2]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#C9CDD2]">{n.tag}</span>
                <h3 className="mt-3 font-heading text-lg font-bold text-white">{n.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/60">{n.body}</p>
                <div className="mt-4 text-xs font-medium text-white/40">{n.date}</div>
              </Glass>
            </Reveal>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <Glass className="flex h-full flex-col p-6">
                <Quote className="size-7 text-[#C9CDD2]/60" />
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/75">&quot;{t.quote}&quot;</p>
                <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/45">{t.name}</div>
              </Glass>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================
export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#141416]">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <HittersLogo className="h-20" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              Chicagoland&apos;s premier travel baseball organization. Developing elite players and
              great people since 1992 — blue-collar grit, AI-powered intelligence.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C9CDD2]">
              <MapPin className="size-4" /> Proudly Chicagoland · Tinley Park · Frankfort · Joliet, IL
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/45">Explore</div>
            <div className="mt-4 flex flex-col gap-2.5">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-white/60 transition hover:text-white">{l.label}</a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/45">Connect</div>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-white/60">
              <a href="mailto:info@upperdeckcougars.com" className="transition hover:text-white">info@upperdeckcougars.com</a>
              <a href="#tryouts" className="transition hover:text-white">2026 Tryout Registration</a>
              <span>Instagram · X · Facebook</span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <div className="text-xs text-white/40">© {new Date().getFullYear()} Upper Deck Cougars · Hitters UDC Baseball Club. All rights reserved.</div>
          <div className="text-xs text-white/40">Player intelligence powered by <span className="font-semibold text-white/60">LevelUp Scout AI</span></div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// FLOATING SCOUT AI BUTTON
// ============================================================================
export function FloatingScoutButton({ onClick }: { onClick: () => void }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={onClick}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#dfe2e6_55%,#b3b8bf_100%)] px-5 py-3.5 font-bold text-black shadow-[0_10px_40px_-6px_rgba(255,255,255,0.4),inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <BaseballIcon className="size-5" />
          <span className="hidden text-sm sm:inline">Scout AI</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
