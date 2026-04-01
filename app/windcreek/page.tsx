'use client';

import { useEffect, useRef, useState } from 'react';

/* ── PARTICLE SYSTEM (masters-style comets) ───────────────────────── */

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    type Comet = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; trail: [number, number][] };

    const comets: Comet[] = [];

    function spawnComet() {
      const isGold = Math.random() < 0.2;
      const color = isGold ? 'rgba(255,180,60,' : 'rgba(163,43,41,';
      const angle = -30 - Math.random() * 30;
      const rad = (angle * Math.PI) / 180;
      const speed = 0.4 + Math.random() * 0.8;
      comets.push({
        x: Math.random() * (canvas?.width || 0) / dpr,
        y: (canvas?.height || 0) / dpr + 20,
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed,
        life: 0,
        maxLife: 400 + Math.random() * 600,
        size: 1.2 + Math.random() * 1.2,
        color,
        trail: [],
      });
    }

    // Seed initial comets
    for (let i = 0; i < 25; i++) spawnComet();

    function draw() {
      if (!ctx || !canvas) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx;
        c.y += c.vy;
        c.life++;
        c.trail.push([c.x, c.y]);
        if (c.trail.length > 40) c.trail.shift();

        const progress = c.life / c.maxLife;
        const alpha = progress < 0.05 ? progress / 0.05 : progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;

        // Trail
        for (let t = 1; t < c.trail.length; t++) {
          const tAlpha = (t / c.trail.length) * alpha * 0.4;
          ctx.beginPath();
          ctx.moveTo(c.trail[t - 1][0], c.trail[t - 1][1]);
          ctx.lineTo(c.trail[t][0], c.trail[t][1]);
          ctx.strokeStyle = c.color + tAlpha + ')';
          ctx.lineWidth = c.size * (t / c.trail.length);
          ctx.stroke();
        }

        // Head
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.fillStyle = c.color + alpha * 0.8 + ')';
        ctx.shadowColor = c.color + '0.6)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (c.life >= c.maxLife) {
          comets.splice(i, 1);
          spawnComet();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq.matches) {
      draw();
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

/* ── SCROLL REVEAL HOOK ───────────────────────────────────────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, className: `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` };
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const r = useReveal();
  return <div ref={r.ref} className={`${r.className} ${className}`}>{children}</div>;
}

/* ── MAIN PAGE ────────────────────────────────────────────────────── */

export default function WindCreekProposal() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{
      background: 'radial-gradient(circle at 15% 20%, rgba(163,43,41,0.18), transparent 28%), radial-gradient(circle at 82% 18%, rgba(255,180,60,0.12), transparent 26%), radial-gradient(circle at 50% 78%, rgba(163,43,41,0.08), transparent 28%), linear-gradient(160deg, #050505 0%, #0a0808 32%, #0d0808 65%, #050505 100%)',
    }}>
      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(circle at center, black 45%, transparent 88%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 45%, transparent 88%)',
      }} />

      <ParticleCanvas />

      {/* Fixed logo header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-5 transition-opacity duration-300 ${scrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-6 md:gap-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-breakers-logo.svg"
              alt="The Brand Breakers"
              className="h-10 md:h-14"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div className="w-px h-10 md:h-14 bg-white/20" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wind-creek-logo.svg"
              alt="Wind Creek Chicago Southland"
              className="h-10 md:h-14"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <p className="mt-3 text-[10px] md:text-[13px] font-heading uppercase tracking-[0.22em] text-white/50">
            Championship Experience Proposal
          </p>
        </div>
      </div>

      {/* Sticky nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/[0.08]" style={{ background: 'rgba(5,5,5,0.4)' }}>
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-breakers-logo.svg"
              alt="The Brand Breakers"
              className="h-7"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div className="w-px h-6 bg-white/20" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wind-creek-logo.svg"
              alt="Wind Creek"
              className="h-6"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <nav className="hidden md:flex items-center gap-1 text-sm text-white/60">
            <a href="#vision" className="px-3 py-2 rounded-full hover:bg-white/[0.07] hover:text-white transition-colors">Vision</a>
            <a href="#journey" className="px-3 py-2 rounded-full hover:bg-white/[0.07] hover:text-white transition-colors">Guest Journey</a>
            <a href="#upgrades" className="px-3 py-2 rounded-full hover:bg-white/[0.07] hover:text-white transition-colors">Upgrades</a>
            <a href="#returns" className="px-3 py-2 rounded-full hover:bg-white/[0.07] hover:text-white transition-colors">Returns</a>
          </nav>
        </div>
      </header>

      <main className="relative z-[1]">

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="pt-20 md:pt-24 pb-16 max-w-[1280px] mx-auto px-4 md:px-6">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[11px] uppercase tracking-[0.18em] text-white/60 border border-white/[0.1]" style={{ background: 'rgba(255,255,255,0.05)' }}>
              Chicago Southland nightlife, redesigned for revenue
            </div>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-7 mt-6">
            {/* Left copy */}
            <Reveal>
              <GlassCard className="p-7 md:p-9">
                <Pill>Three nights. One owned property.</Pill>
                <h1 className="mt-4 mb-5 font-heading text-[clamp(2.2rem,1.6rem+3vw,4.2rem)] leading-[0.93] tracking-tight max-w-[11ch]">
                  Make Wind Creek feel like <em className="not-italic" style={{ color: '#e8503e' }}>the place</em> everyone needs to be.
                </h1>
                <p className="text-white/60 max-w-[58ch] leading-relaxed">
                  Presented by <strong className="text-white/80">The Brand Breakers</strong> for <strong className="text-white/80">Wind Creek Chicago Southland</strong> &mdash; this concept transforms a standard live-music booking into a premium casino entertainment property: a three-night DJ Championship built to drive arrivals, dwell time, VIP behavior, social proof, and repeat visitation.
                </p>
                <div className="flex flex-wrap gap-3.5 mt-7">
                  <a href="#journey" className="cta-btn">Walk the experience</a>
                  <a href="#returns" className="ghost-btn">See the upside</a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8">
                  <Metric value="3 Nights" text="Designed as a season, not a one-off booking." />
                  <Metric value="100 &ndash; 300" text="Expected guest range each night, optimized toward the high end." />
                  <Metric value="Premium" text="VIP-led, content-rich, fully produced and casino-owned." />
                </div>
              </GlassCard>
            </Reveal>

            {/* Right story panel */}
            <Reveal>
              <GlassCard className="p-6 flex flex-col gap-5" style={{
                background: 'radial-gradient(circle at 80% 14%, rgba(163,43,41,0.18), transparent 24%), radial-gradient(circle at 15% 88%, rgba(255,180,60,0.16), transparent 25%), rgba(255,255,255,0.03)',
              }}>
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <div className="text-[11px] tracking-[0.16em] uppercase text-white/40">Property positioning</div>
                    <div className="text-[1.1rem] font-bold mt-1.5">From casino floor to destination moment</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-full text-[12px]" style={{ background: 'rgba(163,43,41,0.2)', color: '#e8503e' }}>Live</div>
                </div>

                {/* Stage visualization */}
                <div className="relative min-h-[340px] md:min-h-[420px] rounded-3xl border border-white/[0.1] overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(5,8,12,0.3), rgba(9,7,7,0.7))' }}>
                  <svg viewBox="0 0 600 420" className="absolute inset-0 w-full h-full" aria-label="Stylized championship stage">
                    <defs>
                      <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0b0808"/>
                        <stop offset="100%" stopColor="#1a0e0e"/>
                      </linearGradient>
                      <linearGradient id="screen" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#e8503e" stopOpacity=".9"/>
                        <stop offset="50%" stopColor="#ffb43c" stopOpacity=".8"/>
                        <stop offset="100%" stopColor="#e8503e" stopOpacity=".85"/>
                      </linearGradient>
                      <filter id="blurGlow"><feGaussianBlur stdDeviation="16"/></filter>
                    </defs>
                    <rect width="600" height="420" fill="url(#floor)"/>
                    <ellipse cx="300" cy="355" rx="260" ry="42" fill="#050505"/>
                    <rect x="90" y="118" width="420" height="108" rx="26" fill="url(#screen)" opacity=".18" filter="url(#blurGlow)"/>
                    <rect x="110" y="128" width="380" height="92" rx="22" fill="#0a0505" stroke="rgba(255,255,255,.2)"/>
                    <rect x="155" y="148" width="290" height="52" rx="18" fill="url(#screen)" opacity=".78"/>
                    <rect x="232" y="240" width="136" height="62" rx="22" fill="#0d0808" stroke="rgba(255,255,255,.14)"/>
                    <rect x="254" y="212" width="92" height="36" rx="14" fill="#110808"/>
                    <circle cx="146" cy="112" r="10" fill="#e8503e"/>
                    <circle cx="456" cy="112" r="10" fill="#ffb43c"/>
                    <circle cx="196" cy="96" r="6" fill="#ffd976"/>
                    <circle cx="406" cy="96" r="6" fill="#ffd976"/>
                    <path d="M72 282C176 236 424 236 528 282" stroke="rgba(255,255,255,.16)" strokeWidth="2" strokeDasharray="6 10"/>
                    <g opacity=".82">
                      <circle cx="230" cy="320" r="5" fill="#d5d5d5"/><circle cx="258" cy="326" r="5" fill="#d5d5d5"/>
                      <circle cx="286" cy="320" r="5" fill="#d5d5d5"/><circle cx="314" cy="326" r="5" fill="#d5d5d5"/>
                      <circle cx="342" cy="320" r="5" fill="#d5d5d5"/><circle cx="370" cy="326" r="5" fill="#d5d5d5"/>
                    </g>
                  </svg>

                  {/* Floating cards */}
                  <div className="absolute top-5 right-4 w-[180px] backdrop-blur-xl rounded-[20px] p-3.5 border border-white/[0.14]" style={{ background: 'rgba(8,5,5,0.46)', boxShadow: '0 12px 40px rgba(0,0,0,0.28)' }}>
                    <div className="text-[11px] text-white/40 uppercase tracking-[0.14em]">VIP trigger</div>
                    <div className="font-extrabold text-lg mt-1.5">Arrival moment</div>
                    <div className="text-white/60 text-[13px] mt-1">Red carpet energy, branded photo wall, hosted welcome, immediate social share.</div>
                  </div>
                  <div className="absolute bottom-5 left-4 w-[200px] backdrop-blur-xl rounded-[20px] p-3.5 border border-white/[0.14]" style={{ background: 'rgba(8,5,5,0.46)', boxShadow: '0 12px 40px rgba(0,0,0,0.28)' }}>
                    <div className="text-[11px] text-white/40 uppercase tracking-[0.14em]">Gaming bridge</div>
                    <div className="font-extrabold text-lg mt-1.5">Stay longer</div>
                    <div className="text-white/60 text-[13px] mt-1">Program each segment to push guests into bar, lounge, and floor activity.</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Metric value="Ownable" text="Wind Creek-branded championship identity, not rented entertainment." />
                  <Metric value="Repeatable" text="Built so the property can scale it into a recurring signature night." />
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </section>

        {/* ── VISION ────────────────────────────────────────── */}
        <section id="vision" className="py-16 md:py-20 max-w-[1280px] mx-auto px-4 md:px-6">
          <Reveal>
            <SectionHead
              pill="What changes"
              heading="Everything feels more premium."
              text="The guest should not feel like they walked into a casino running an event. They should feel like they stepped into a polished entertainment property where every surface, every cue, and every transition was designed for status, energy, and spend."
            />
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Reveal>
              <GlassCard className="p-6">
                <Pill>Atmosphere upgrade</Pill>
                <h3 className="text-[1.1rem] font-bold mb-2.5">Stage the room like a championship, not a booking.</h3>
                <p className="text-white/60">Lighting, reveal moments, trophy visuals, signage, and host cues make the space feel elevated from first sightline to final photo.</p>
              </GlassCard>
            </Reveal>
            <Reveal>
              <GlassCard className="p-6">
                <Pill>Guest upgrade</Pill>
                <h3 className="text-[1.1rem] font-bold mb-2.5">Move guests through a premium social journey.</h3>
                <p className="text-white/60">Arrival, competition, voting, VIP moments, and closing celebration create a clear emotional arc that keeps people in the building longer.</p>
              </GlassCard>
            </Reveal>
            <Reveal>
              <GlassCard className="p-6">
                <Pill>Brand upgrade</Pill>
                <h3 className="text-[1.1rem] font-bold mb-2.5">Give Wind Creek a nightlife asset it can own.</h3>
                <p className="text-white/60">This becomes property equity: a format, a look, a content library, and a recurring event story the casino can grow.</p>
              </GlassCard>
            </Reveal>
          </div>
        </section>

        {/* ── GUEST JOURNEY ─────────────────────────────────── */}
        <section id="journey" className="py-16 md:py-20 max-w-[1280px] mx-auto px-4 md:px-6">
          <Reveal>
            <SectionHead
              pill="Guest journey"
              heading="Three chapters, one clear progression."
              text="The story is simple: build anticipation, create a social competition worth talking about, then convert that energy into a championship night that feels larger than a local event."
            />
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 lg:gap-5 items-center">
            <Reveal><FlowNode pill="Night 1" title="Discovery" text="Guests arrive to a room that immediately signals something bigger than a normal casino set. The first night introduces the competitors, the judges, the format, and the exclusivity." /></Reveal>
            <FlowArrow />
            <Reveal><FlowNode pill="Night 2" title="Momentum" text="The middle night deepens rivalry, expands content capture, and pushes the property's social proof. Returning guests feel inside the story, not just present for music." /></Reveal>
            <FlowArrow />
            <Reveal><FlowNode pill="Night 3" title="Championship" text="Finalists compete in a room that now has narrative weight. The crowning moment, trophy presentation, and signing ceremony make the property feel like the home of the title." /></Reveal>
          </div>
        </section>

        {/* ── TIMELINE + SERVICES ───────────────────────────── */}
        <section className="py-16 md:py-20 max-w-[1280px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Reveal>
              <GlassCard className="p-6 md:p-7">
                <Pill>Two-hour architecture</Pill>
                <h3 className="text-[1.1rem] font-bold mb-5">A tighter show creates better casino behavior.</h3>
                <div className="space-y-5">
                  <TimelineRow time="0:00 &ndash; 0:20" title="Arrival and social ignition." desc="Hosts, photo moments, branded visuals, first drink, immediate sense of occasion." />
                  <TimelineRow time="0:20 &ndash; 1:15" title="Competition and crowd ownership." desc="Curated DJ sets, judge reactions, vote pushes, and high-energy transitions that keep the room engaged." />
                  <TimelineRow time="1:15 &ndash; 2:00" title="Winner moment and property conversion." desc="Awards, VIP sendoff, gaming-floor continuation, lounge migration, and post-show capture." />
                </div>
              </GlassCard>
            </Reveal>
            <Reveal>
              <GlassCard className="p-6 md:p-7" id="upgrades">
                <Pill>Service stack</Pill>
                <h3 className="text-[1.1rem] font-bold mb-5">Where my services upgrade the property experience.</h3>
                <div className="space-y-3.5">
                  <KPI title="Creative direction" desc="Theme, staging, run-of-show, talent curation, championship identity." />
                  <KPI title="Production control" desc="Lighting, audio, host flow, ceremony moments, premium room feel." />
                  <KPI title="Audience growth" desc="Content rollout, social velocity, radio amplification, list-building momentum." />
                  <KPI title="VIP integration" desc="High-roller treatment, guest gifting, special access, visual prestige." />
                  <KPI title="Post-event assets" desc="Highlight reels, photo library, recap cuts, a reusable property story." />
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </section>

        {/* ── RETURNS ───────────────────────────────────────── */}
        <section id="returns" className="py-16 md:py-20 max-w-[1280px] mx-auto px-4 md:px-6">
          <Reveal>
            <SectionHead
              pill="What Wind Creek gains"
              heading="The business case without showing a budget line."
              text="The page should sell a feeling, but the feeling still needs to map to outcomes: more arrivals, longer stays, stronger VIP behavior, more content, and a clearer position in the market."
            />
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Reveal>
              <GlassCard className="p-6 md:p-7">
                <Pill>Impact map</Pill>
                <h3 className="text-[1.1rem] font-bold mb-5">Each upgrade changes guest behavior.</h3>
                <div className="space-y-3">
                  <ImpactBar label="Traffic pull" pct={92} level="High" />
                  <ImpactBar label="Dwell time" pct={88} level="High" />
                  <ImpactBar label="VIP spend" pct={84} level="Strong" />
                  <ImpactBar label="Social share" pct={90} level="High" />
                  <ImpactBar label="Brand recall" pct={95} level="Elite" />
                </div>
              </GlassCard>
            </Reveal>
            <Reveal>
              <GlassCard className="p-6 md:p-7">
                <Pill>Revenue logic</Pill>
                <h3 className="text-[1.1rem] font-bold mb-4">Why this matters beyond the room.</h3>
                <p className="text-white/60 mb-5">A premium entertainment property does not just fill a two-hour slot. It creates earlier arrivals, keeps groups onsite longer, improves bar and VIP behavior, and gives the casino a branded reason to bring people back.</p>
                <div className="space-y-3.5">
                  <KPI title="Gaming bridge" desc="Guests move from the show into the broader floor and lounge ecosystem." />
                  <KPI title="F&B lift" desc="Structured arrival and VIP programming increase drink and table spend." />
                  <KPI title="Hotel value" desc="Premium nightlife supports the resort narrative, not only the casino floor." />
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </section>

        {/* ── QUOTES ────────────────────────────────────────── */}
        <section className="py-16 md:py-20 max-w-[1280px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Reveal>
              <GlassCard className="p-7 md:p-8 flex flex-col gap-5">
                <Pill>Positioning statement</Pill>
                <blockquote className="font-heading text-[clamp(1.6rem,1.2rem+1.1vw,2.3rem)] leading-[1.05] tracking-tight">
                  Wind Creek should not look like a venue renting entertainment. It should look like the property that <em className="not-italic" style={{ color: '#e8503e' }}>created the championship</em> everyone wants to win.
                </blockquote>
                <p className="text-white/40 text-sm">This framing moves the conversation from cost to ownership, from staffing to status, and from a weekend event to a recurring asset.</p>
              </GlassCard>
            </Reveal>
            <Reveal>
              <GlassCard className="p-7 md:p-8 flex flex-col gap-5">
                <Pill>Decision frame</Pill>
                <blockquote className="font-heading text-[clamp(1.6rem,1.2rem+1.1vw,2.3rem)] leading-[1.05] tracking-tight">
                  Approve the premium version, and the property gets a stronger room, a stronger story, and a <em className="not-italic" style={{ color: '#ffb43c' }}>stronger reason</em> for people to return.
                </blockquote>
                <p className="text-white/40 text-sm">The goal is not to present a budget spreadsheet. The goal is to make the premium path feel obvious.</p>
              </GlassCard>
            </Reveal>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────── */}
        <section className="py-16 md:py-24 max-w-[1280px] mx-auto px-4 md:px-6 text-center">
          <Reveal>
            <GlassCard className="p-8 md:p-10 max-w-3xl mx-auto">
              <Pill className="justify-center">Next step</Pill>
              <h2 className="font-heading text-[clamp(1.8rem,1.4rem+1.4vw,2.8rem)] leading-[1] mt-2 mb-4">Greenlight the championship experience.</h2>
              <p className="text-white/60 max-w-[58ch] mx-auto leading-relaxed">
                Premium talent coordination, elevated show design, branded content, VIP treatment, and a property-owned entertainment story &mdash; all shaped into a single experience that makes Wind Creek feel bigger, sharper, and harder to compete with.
              </p>
              <div className="flex flex-wrap gap-3.5 justify-center mt-7">
                <a href="mailto:marketing@thebrandbreakers.com?subject=Wind%20Creek%20Championship%20Experience" className="cta-btn">Approve concept</a>
                <a href="#vision" className="ghost-btn">Review journey</a>
              </div>
            </GlassCard>
          </Reveal>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-[1] max-w-[1280px] mx-auto px-4 md:px-6 pb-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.08]">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-breakers-logo.svg" alt="The Brand Breakers" className="h-8" style={{ filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
            <div className="w-px h-6 bg-white/10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wind-creek-logo.svg" alt="Wind Creek" className="h-7" style={{ filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
          </div>
          <div className="text-white/30 text-sm text-center md:text-right">
            <p>Prepared by The Brand Breakers for Wind Creek Chicago Southland</p>
            <p className="text-white/20 text-xs mt-1">marketing@thebrandbreakers.com &middot; (312) 358-3378 &middot; Confidential 2026</p>
          </div>
        </div>
      </footer>

      {/* Inline styles for buttons */}
      <style jsx global>{`
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0 20px;
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(163,43,41,0.4);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: linear-gradient(135deg, rgba(163,43,41,0.28), rgba(232,80,62,0.16));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 12px 40px rgba(0,0,0,0.28);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          text-decoration: none;
        }
        .cta-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(163,43,41,0.65);
          background: linear-gradient(135deg, rgba(163,43,41,0.4), rgba(232,80,62,0.25));
        }
        .ghost-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0 20px;
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: transform 0.2s ease, border-color 0.2s ease;
          text-decoration: none;
        }
        .ghost-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.26);
        }
      `}</style>
    </div>
  );
}

/* ── REUSABLE COMPONENTS ──────────────────────────────────────────── */

function GlassCard({ children, className = '', style, id }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; id?: string }) {
  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-[32px] border border-white/[0.1] backdrop-blur-2xl ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        boxShadow: '0 24px 90px rgba(0,0,0,0.45)',
        ...style,
      }}
    >
      {/* Inset shine */}
      <div className="absolute inset-px rounded-[inherit] pointer-events-none" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 24%, transparent 76%, rgba(255,255,255,0.03))',
      }} />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase mb-3.5 ${className}`} style={{ color: '#e8503e' }}>
      {children}
    </div>
  );
}

function Metric({ value, text }: { value: string; text: string }) {
  return (
    <div className="p-4 rounded-[20px] border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <strong className="block text-[1.35rem] mb-1.5 font-heading" dangerouslySetInnerHTML={{ __html: value }} />
      <span className="text-white/40 text-[13px] leading-snug">{text}</span>
    </div>
  );
}

function SectionHead({ pill, heading, text }: { pill: string; heading: string; text: string }) {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-5 md:items-end mb-7">
      <div>
        <Pill>{pill}</Pill>
        <h2 className="font-heading text-[clamp(2rem,1.5rem+1.4vw,3rem)] leading-[1] tracking-tight">{heading}</h2>
      </div>
      <p className="text-white/60 max-w-[58ch] leading-relaxed">{text}</p>
    </div>
  );
}

function FlowNode({ pill, title, text }: { pill: string; title: string; text: string }) {
  return (
    <GlassCard className="p-6 min-h-[220px]">
      <Pill>{pill}</Pill>
      <h3 className="text-[1.1rem] font-bold mb-2.5">{title}</h3>
      <p className="text-white/60">{text}</p>
    </GlassCard>
  );
}

function FlowArrow() {
  return (
    <div className="hidden lg:block">
      <div className="relative h-[2px] w-[120px] mx-auto" style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(163,43,41,0.65), rgba(255,255,255,0.1))',
      }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 border-t-[7px] border-b-[7px] border-l-[12px] border-transparent border-l-[rgba(163,43,41,0.7)]" />
      </div>
    </div>
  );
}

function TimelineRow({ time, title, desc }: { time: string; title: string; desc: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-4">
      <div className="font-bold text-sm" style={{ color: '#ffb43c' }} dangerouslySetInnerHTML={{ __html: time }} />
      <div>
        <strong>{title}</strong>
        <p className="text-white/60 text-sm mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function KPI({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex justify-between gap-5 items-baseline p-4 rounded-[20px] border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <strong className="text-[1.1rem] shrink-0">{title}</strong>
      <span className="text-white/40 text-sm text-right">{desc}</span>
    </div>
  );
}

function ImpactBar({ label, pct, level }: { label: string; pct: number; level: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr_60px] gap-3.5 items-center">
      <div className="text-sm">{label}</div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, rgba(163,43,41,0.9), rgba(255,180,60,0.9))' }} />
      </div>
      <div className="text-sm text-white/50 text-right">{level}</div>
    </div>
  );
}
