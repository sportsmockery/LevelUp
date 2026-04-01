'use client';

import { useEffect, useRef, useState } from 'react';

/* ── PARTICLE SYSTEM (masters-style CSS comets) ───────────────────── */

function CometBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    // Red comets
    for (let i = 0; i < 35; i++) {
      const angle = -30 - 30 * Math.random();
      const rad = (angle * Math.PI) / 180;
      const travel = 120 + 80 * Math.random();
      const el = document.createElement('div');
      el.className = 'wc-comet';
      el.style.cssText = `--dur:${8 + 14 * Math.random()}s;--del:${30 * Math.random()}s;--sx:${70 * Math.random()}%;--sy:${50 + 50 * Math.random()}%;--a:${angle}deg;--tx:${Math.cos(rad) * travel}vw;--ty:${Math.sin(rad) * travel}vh`;
      container.appendChild(el);
    }
    // Gold comets
    for (let j = 0; j < 8; j++) {
      const angle = -20 - 140 * Math.random();
      const rad = (angle * Math.PI) / 180;
      const travel = 100 + 100 * Math.random();
      const el = document.createElement('div');
      el.className = 'wc-comet wc-gold';
      el.style.cssText = `--dur:${10 + 12 * Math.random()}s;--del:${35 * Math.random()}s;--sx:${80 * Math.random()}%;--sy:${100 * Math.random()}%;--a:${angle}deg;--tx:${Math.cos(rad) * travel}vw;--ty:${Math.sin(rad) * travel}vh`;
      container.appendChild(el);
    }

    return () => { container.innerHTML = ''; };
  }, []);

  return <div ref={ref} className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }} />;
}

/* ── SCROLL REVEAL ────────────────────────────────────────────────── */

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}>
      {children}
    </div>
  );
}

/* ── MAIN ─────────────────────────────────────────────────────────── */

export default function WindCreekProposal() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 180);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="wc-page">
      <CometBackground />

      {/* ── FIXED LOGO LOCKUP ─────────────────────────────── */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-opacity duration-500 ${scrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="pt-6 pb-4 md:pt-8 md:pb-6 text-center">
          <div className="flex items-center justify-center gap-5 md:gap-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-breakers-logo.svg"
              alt="The Brand Breakers"
              className="h-8 sm:h-10 md:h-12 w-auto"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div className="h-8 sm:h-10 md:h-12 w-px bg-white/20" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wind-creek-logo.svg"
              alt="Wind Creek Chicago Southland"
              className="h-6 sm:h-7 md:h-9 w-auto"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <p className="wc-subtitle mt-3 md:mt-4">Championship Experience Proposal</p>
        </div>
      </div>

      {/* ── STICKY NAV ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 wc-nav-blur">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 flex items-center justify-between h-14 md:h-16">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-breakers-logo.svg" alt="The Brand Breakers" className="h-5 md:h-6 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <div className="w-px h-4 md:h-5 bg-white/15" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wind-creek-logo.svg" alt="Wind Creek" className="h-4 md:h-5 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <nav className="hidden md:flex items-center gap-1 text-[13px] text-white/50 font-medium">
            {['Vision', 'Guest Journey', 'Upgrades', 'Returns'].map(t => (
              <a key={t} href={`#${t.toLowerCase().replace(' ', '-')}`} className="px-3 py-2 rounded-full hover:bg-white/[0.06] hover:text-white/80 transition-colors">{t}</a>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-[1]">

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="pt-28 sm:pt-32 md:pt-36 pb-12 md:pb-16 wc-shell">
          <Reveal>
            <div className="wc-eyebrow">Chicago Southland nightlife, redesigned for revenue</div>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5 md:gap-6 mt-5 md:mt-7">
            <Reveal>
              <Glass className="p-6 sm:p-7 md:p-9">
                <Pill>Three nights. One owned property.</Pill>
                <h1 className="wc-h1 mt-3 mb-4 md:mt-4 md:mb-5">
                  Make Wind Creek feel like <em className="not-italic wc-accent">the place</em> everyone needs to be.
                </h1>
                <p className="wc-body">
                  Presented by <strong className="text-white/80">The Brand Breakers</strong> for <strong className="text-white/80">Wind Creek Chicago Southland</strong> &mdash; this concept transforms a standard live-music booking into a premium casino entertainment property: a three-night DJ Championship built to drive arrivals, dwell time, VIP behavior, social proof, and repeat visitation.
                </p>
                <div className="flex flex-wrap gap-3 mt-6 md:mt-7">
                  <a href="#guest-journey" className="wc-cta">Walk the experience</a>
                  <a href="#returns" className="wc-ghost">See the upside</a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 md:mt-8">
                  <Stat value="3 Nights" text="Designed as a season, not a one-off booking." />
                  <Stat value="100&ndash;300" text="Expected guest range each night." />
                  <Stat value="Premium" text="VIP-led, content-rich, casino-owned." />
                </div>
              </Glass>
            </Reveal>

            <Reveal>
              <Glass className="p-5 sm:p-6 flex flex-col gap-4 md:gap-5 wc-story-bg">
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <div className="wc-label">Property positioning</div>
                    <div className="text-[1rem] md:text-[1.1rem] font-semibold mt-1">From casino floor to destination moment</div>
                  </div>
                  <div className="wc-badge">Live</div>
                </div>

                <div className="relative min-h-[260px] sm:min-h-[320px] md:min-h-[380px] rounded-2xl md:rounded-3xl border border-white/[0.08] overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(5,8,12,0.3), rgba(9,7,7,0.7))' }}>
                  <svg viewBox="0 0 600 420" className="absolute inset-0 w-full h-full" aria-hidden="true">
                    <defs>
                      <linearGradient id="fl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0b0808"/><stop offset="100%" stopColor="#1a0e0e"/></linearGradient>
                      <linearGradient id="sc" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#e8503e" stopOpacity=".9"/><stop offset="50%" stopColor="#ffb43c" stopOpacity=".8"/><stop offset="100%" stopColor="#e8503e" stopOpacity=".85"/></linearGradient>
                      <filter id="bg"><feGaussianBlur stdDeviation="16"/></filter>
                    </defs>
                    <rect width="600" height="420" fill="url(#fl)"/>
                    <ellipse cx="300" cy="355" rx="260" ry="42" fill="#050505"/>
                    <rect x="90" y="118" width="420" height="108" rx="26" fill="url(#sc)" opacity=".18" filter="url(#bg)"/>
                    <rect x="110" y="128" width="380" height="92" rx="22" fill="#0a0505" stroke="rgba(255,255,255,.2)"/>
                    <rect x="155" y="148" width="290" height="52" rx="18" fill="url(#sc)" opacity=".78"/>
                    <rect x="232" y="240" width="136" height="62" rx="22" fill="#0d0808" stroke="rgba(255,255,255,.14)"/>
                    <rect x="254" y="212" width="92" height="36" rx="14" fill="#110808"/>
                    <circle cx="146" cy="112" r="10" fill="#e8503e"/><circle cx="456" cy="112" r="10" fill="#ffb43c"/>
                    <circle cx="196" cy="96" r="6" fill="#ffd976"/><circle cx="406" cy="96" r="6" fill="#ffd976"/>
                    <path d="M72 282C176 236 424 236 528 282" stroke="rgba(255,255,255,.16)" strokeWidth="2" strokeDasharray="6 10"/>
                    <g opacity=".7"><circle cx="230" cy="320" r="5" fill="#d5d5d5"/><circle cx="258" cy="326" r="5" fill="#d5d5d5"/><circle cx="286" cy="320" r="5" fill="#d5d5d5"/><circle cx="314" cy="326" r="5" fill="#d5d5d5"/><circle cx="342" cy="320" r="5" fill="#d5d5d5"/><circle cx="370" cy="326" r="5" fill="#d5d5d5"/></g>
                  </svg>
                  {/* Floating cards — hidden on very small screens */}
                  <div className="hidden sm:block absolute top-4 right-3 md:top-5 md:right-4 w-[160px] md:w-[180px] wc-float-card">
                    <div className="wc-label">VIP trigger</div>
                    <div className="font-bold text-base md:text-lg mt-1">Arrival moment</div>
                    <div className="wc-body text-[12px] md:text-[13px] mt-1">Red carpet energy, branded photo wall, hosted welcome.</div>
                  </div>
                  <div className="hidden sm:block absolute bottom-4 left-3 md:bottom-5 md:left-4 w-[170px] md:w-[200px] wc-float-card">
                    <div className="wc-label">Gaming bridge</div>
                    <div className="font-bold text-base md:text-lg mt-1">Stay longer</div>
                    <div className="wc-body text-[12px] md:text-[13px] mt-1">Push guests into bar, lounge, and floor activity.</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat value="Ownable" text="Casino-branded championship identity." />
                  <Stat value="Repeatable" text="Scale into a recurring signature night." />
                </div>
              </Glass>
            </Reveal>
          </div>
        </section>

        {/* ── VISION ───────────────────────────────────────── */}
        <section id="vision" className="wc-section">
          <Reveal>
            <SectionHead pill="What changes" heading="Everything feels more premium." text="The guest should not feel like they walked into a casino running an event. They should feel like they stepped into a polished entertainment property where every surface, every cue, and every transition was designed for status, energy, and spend." />
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {[
              { pill: 'Atmosphere upgrade', h: 'Stage the room like a championship, not a booking.', p: 'Lighting, reveal moments, trophy visuals, signage, and host cues make the space feel elevated from first sightline to final photo.' },
              { pill: 'Guest upgrade', h: 'Move guests through a premium social journey.', p: 'Arrival, competition, voting, VIP moments, and closing celebration create a clear emotional arc that keeps people in the building longer.' },
              { pill: 'Brand upgrade', h: 'Give Wind Creek a nightlife asset it can own.', p: 'This becomes property equity: a format, a look, a content library, and a recurring event story the casino can grow.' },
            ].map((c, i) => (
              <Reveal key={i}><Glass className="p-5 md:p-6"><Pill>{c.pill}</Pill><h3 className="wc-h3">{c.h}</h3><p className="wc-body">{c.p}</p></Glass></Reveal>
            ))}
          </div>
        </section>

        {/* ── GUEST JOURNEY ─────────────────────────────────── */}
        <section id="guest-journey" className="wc-section">
          <Reveal>
            <SectionHead pill="Guest journey" heading="Three chapters, one clear progression." text="Build anticipation, create a social competition worth talking about, then convert that energy into a championship night that feels larger than a local event." />
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            {[
              { pill: 'Night 1', h: 'Discovery', p: 'Guests arrive to a room that immediately signals something bigger. The first night introduces the competitors, the judges, the format, and the exclusivity.' },
              { pill: 'Night 2', h: 'Momentum', p: 'The middle night deepens rivalry, expands content capture, and pushes social proof. Returning guests feel inside the story, not just present for music.' },
              { pill: 'Night 3', h: 'Championship', p: 'Finalists compete in a room with narrative weight. The crowning moment, trophy presentation, and signing ceremony make the property feel like the home of the title.' },
            ].map((c, i) => (
              <Reveal key={i}>
                <Glass className="p-5 md:p-6 relative">
                  {i < 2 && <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-px bg-gradient-to-r from-transparent via-[#a32b29]/60 to-transparent" />}
                  <Pill>{c.pill}</Pill>
                  <h3 className="wc-h3">{c.h}</h3>
                  <p className="wc-body">{c.p}</p>
                </Glass>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── TIMELINE + SERVICES ──────────────────────────── */}
        <section className="wc-section">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <Reveal>
              <Glass className="p-5 md:p-7">
                <Pill>Two-hour architecture</Pill>
                <h3 className="wc-h3 mb-5">A tighter show creates better casino behavior.</h3>
                <div className="space-y-4 md:space-y-5">
                  {[
                    { t: '0:00 – 0:20', h: 'Arrival and social ignition.', d: 'Hosts, photo moments, branded visuals, first drink, immediate sense of occasion.' },
                    { t: '0:20 – 1:15', h: 'Competition and crowd ownership.', d: 'Curated DJ sets, judge reactions, vote pushes, and high-energy transitions.' },
                    { t: '1:15 – 2:00', h: 'Winner moment and property conversion.', d: 'Awards, VIP sendoff, gaming-floor continuation, lounge migration.' },
                  ].map((r, i) => (
                    <div key={i} className="flex gap-3 md:gap-4">
                      <div className="wc-time shrink-0 w-[80px] md:w-[100px]">{r.t}</div>
                      <div><strong className="text-[14px]">{r.h}</strong><p className="wc-body text-[13px] mt-0.5">{r.d}</p></div>
                    </div>
                  ))}
                </div>
              </Glass>
            </Reveal>
            <Reveal>
              <Glass className="p-5 md:p-7" id="upgrades">
                <Pill>Service stack</Pill>
                <h3 className="wc-h3 mb-5">Where my services upgrade the property experience.</h3>
                <div className="space-y-3">
                  {[
                    { t: 'Creative direction', d: 'Theme, staging, run-of-show, talent curation, championship identity.' },
                    { t: 'Production control', d: 'Lighting, audio, host flow, ceremony moments, premium room feel.' },
                    { t: 'Audience growth', d: 'Content rollout, social velocity, radio amplification, list-building.' },
                    { t: 'VIP integration', d: 'High-roller treatment, guest gifting, special access, visual prestige.' },
                    { t: 'Post-event assets', d: 'Highlight reels, photo library, recap cuts, a reusable property story.' },
                  ].map((k, i) => (
                    <div key={i} className="wc-kpi">
                      <strong className="text-[14px] md:text-[15px] shrink-0">{k.t}</strong>
                      <span className="wc-body text-[13px] text-right">{k.d}</span>
                    </div>
                  ))}
                </div>
              </Glass>
            </Reveal>
          </div>
        </section>

        {/* ── RETURNS ──────────────────────────────────────── */}
        <section id="returns" className="wc-section">
          <Reveal>
            <SectionHead pill="What Wind Creek gains" heading="The business case without showing a budget line." text="More arrivals, longer stays, stronger VIP behavior, more content, and a clearer position in the market." />
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <Reveal>
              <Glass className="p-5 md:p-7">
                <Pill>Impact map</Pill>
                <h3 className="wc-h3 mb-5">Each upgrade changes guest behavior.</h3>
                <div className="space-y-3">
                  {[
                    { l: 'Traffic pull', p: 92, v: 'High' }, { l: 'Dwell time', p: 88, v: 'High' },
                    { l: 'VIP spend', p: 84, v: 'Strong' }, { l: 'Social share', p: 90, v: 'High' },
                    { l: 'Brand recall', p: 95, v: 'Elite' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-[13px] w-[90px] md:w-[110px] shrink-0">{b.l}</div>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${b.p}%`, background: 'linear-gradient(90deg, rgba(163,43,41,0.85), rgba(255,180,60,0.85))' }} />
                      </div>
                      <div className="text-[12px] text-white/40 w-[44px] text-right shrink-0">{b.v}</div>
                    </div>
                  ))}
                </div>
              </Glass>
            </Reveal>
            <Reveal>
              <Glass className="p-5 md:p-7">
                <Pill>Revenue logic</Pill>
                <h3 className="wc-h3 mb-3">Why this matters beyond the room.</h3>
                <p className="wc-body mb-5">A premium entertainment property creates earlier arrivals, keeps groups onsite longer, improves bar and VIP behavior, and gives the casino a branded reason to bring people back.</p>
                <div className="space-y-3">
                  {[
                    { t: 'Gaming bridge', d: 'Guests move from the show into the broader floor and lounge.' },
                    { t: 'F&B lift', d: 'Structured arrival and VIP programming increase spend.' },
                    { t: 'Hotel value', d: 'Premium nightlife supports the resort narrative.' },
                  ].map((k, i) => (
                    <div key={i} className="wc-kpi">
                      <strong className="text-[14px] md:text-[15px] shrink-0">{k.t}</strong>
                      <span className="wc-body text-[13px] text-right">{k.d}</span>
                    </div>
                  ))}
                </div>
              </Glass>
            </Reveal>
          </div>
        </section>

        {/* ── QUOTES ───────────────────────────────────────── */}
        <section className="wc-section">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <Reveal>
              <Glass className="p-6 md:p-8 flex flex-col gap-4">
                <Pill>Positioning statement</Pill>
                <blockquote className="wc-quote">
                  Wind Creek should not look like a venue renting entertainment. It should look like the property that <em className="not-italic wc-accent">created the championship</em> everyone wants to win.
                </blockquote>
                <p className="text-white/35 text-[13px]">This framing moves the conversation from cost to ownership, from staffing to status, and from a weekend event to a recurring asset.</p>
              </Glass>
            </Reveal>
            <Reveal>
              <Glass className="p-6 md:p-8 flex flex-col gap-4">
                <Pill>Decision frame</Pill>
                <blockquote className="wc-quote">
                  Approve the premium version, and the property gets a stronger room, a stronger story, and a <em className="not-italic wc-gold">stronger reason</em> for people to return.
                </blockquote>
                <p className="text-white/35 text-[13px]">The goal is not to present a budget spreadsheet. The goal is to make the premium path feel obvious.</p>
              </Glass>
            </Reveal>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section className="wc-section pb-8 md:pb-12 text-center">
          <Reveal>
            <Glass className="p-7 md:p-10 max-w-3xl mx-auto">
              <Pill className="justify-center">Next step</Pill>
              <h2 className="wc-h2 mt-1 mb-3 md:mb-4">Greenlight the championship experience.</h2>
              <p className="wc-body max-w-[52ch] mx-auto">
                Premium talent coordination, elevated show design, branded content, VIP treatment, and a property-owned entertainment story &mdash; shaped into one experience that makes Wind Creek harder to compete with.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-6 md:mt-7">
                <a href="mailto:marketing@thebrandbreakers.com?subject=Wind%20Creek%20Championship%20Experience" className="wc-cta">Approve concept</a>
                <a href="#vision" className="wc-ghost">Review journey</a>
              </div>
            </Glass>
          </Reveal>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-[1] wc-shell pb-8 md:pb-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 pt-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-breakers-logo.svg" alt="The Brand Breakers" className="h-6 md:h-7 w-auto opacity-40" style={{ filter: 'brightness(0) invert(1)' }} />
            <div className="w-px h-5 bg-white/10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wind-creek-logo.svg" alt="Wind Creek" className="h-5 md:h-6 w-auto opacity-40" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <div className="text-white/25 text-[12px] md:text-[13px] text-center md:text-right leading-relaxed">
            <p>Prepared by The Brand Breakers for Wind Creek Chicago Southland</p>
            <p className="text-white/15 mt-0.5">marketing@thebrandbreakers.com &middot; (312) 358-3378 &middot; Confidential 2026</p>
          </div>
        </div>
      </footer>

      {/* ── ALL STYLES ─────────────────────────────────────── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap');

        .wc-page {
          min-height: 100vh;
          color: #eef6ff;
          overflow-x: hidden;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          background:
            radial-gradient(circle at 15% 20%, rgba(163,43,41,0.16), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(255,180,60,0.10), transparent 28%),
            radial-gradient(circle at 50% 78%, rgba(163,43,41,0.06), transparent 30%),
            linear-gradient(160deg, #050505 0%, #090606 32%, #0b0707 65%, #050505 100%);
        }
        .wc-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: radial-gradient(circle at center, black 40%, transparent 85%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 85%);
          opacity: 0.25;
        }

        /* Typography */
        .wc-subtitle {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
        }
        @media (min-width: 768px) { .wc-subtitle { font-size: 14px; } }

        .wc-h1 {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: clamp(1.8rem, 1.2rem + 2.8vw, 3.8rem);
          line-height: 0.95;
          letter-spacing: -0.03em;
          font-weight: 700;
          max-width: 13ch;
        }
        .wc-h2 {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: clamp(1.6rem, 1.2rem + 1.4vw, 2.6rem);
          line-height: 1;
          letter-spacing: -0.02em;
          font-weight: 700;
        }
        .wc-h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
          line-height: 1.35;
        }
        @media (min-width: 768px) { .wc-h3 { font-size: 1.05rem; } }

        .wc-quote {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: clamp(1.3rem, 1rem + 0.9vw, 2rem);
          line-height: 1.1;
          letter-spacing: -0.02em;
          font-weight: 600;
        }
        .wc-body { color: rgba(255,255,255,0.50); line-height: 1.6; }
        .wc-label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.35); font-weight: 600; }
        .wc-accent { color: #e8503e; }
        .wc-gold { color: #ffb43c; }
        .wc-time { font-weight: 700; font-size: 13px; color: #ffb43c; font-variant-numeric: tabular-nums; }

        /* Layout */
        .wc-shell { max-width: 1200px; margin: 0 auto; padding-left: 20px; padding-right: 20px; }
        @media (min-width: 768px) { .wc-shell { padding-left: 32px; padding-right: 32px; } }
        .wc-section { padding: 48px 20px; max-width: 1200px; margin: 0 auto; }
        @media (min-width: 768px) { .wc-section { padding: 64px 32px; } }

        /* Nav */
        .wc-nav-blur {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(5,5,5,0.50);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        /* Glass */
        .wc-glass {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.025));
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }
        @media (min-width: 768px) { .wc-glass { border-radius: 28px; } }
        .wc-glass::after {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent 20%, transparent 80%, rgba(255,255,255,0.02));
        }

        .wc-story-bg {
          background:
            radial-gradient(circle at 80% 14%, rgba(163,43,41,0.14), transparent 24%),
            radial-gradient(circle at 15% 88%, rgba(255,180,60,0.12), transparent 25%),
            rgba(255,255,255,0.025) !important;
        }

        /* Eyebrow */
        .wc-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: rgba(255,255,255,0.50);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          font-weight: 500;
        }

        /* Pill */
        .wc-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #e8503e;
          margin-bottom: 12px;
          font-weight: 600;
        }

        /* Badge */
        .wc-badge {
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(163,43,41,0.15);
          color: #e8503e;
          letter-spacing: 0.04em;
        }

        /* KPI row */
        .wc-kpi {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: baseline;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 480px) {
          .wc-kpi {
            flex-direction: column;
            gap: 4px;
            align-items: flex-start;
          }
          .wc-kpi span { text-align: left !important; }
        }

        /* Stat card */
        .wc-stat {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .wc-stat strong {
          display: block;
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .wc-stat span { color: rgba(255,255,255,0.35); font-size: 13px; line-height: 1.4; }

        /* Float card */
        .wc-float-card {
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          background: rgba(8,5,5,0.55);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          padding: 12px 14px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }

        /* Buttons */
        .wc-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 22px;
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(163,43,41,0.35);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          background: linear-gradient(135deg, rgba(163,43,41,0.25), rgba(232,80,62,0.12));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 30px rgba(0,0,0,0.25);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          text-decoration: none;
          letter-spacing: 0.01em;
        }
        .wc-cta:hover { transform: translateY(-1px); border-color: rgba(163,43,41,0.6); }
        .wc-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 22px;
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: transform 0.2s ease, border-color 0.2s ease;
          text-decoration: none;
          letter-spacing: 0.01em;
        }
        .wc-ghost:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.22); }

        /* Comets */
        .wc-comet {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: hsl(4 60% 40%);
          box-shadow: 0 0 4px 1px hsla(4, 60%, 40%, 0.5), 0 0 12px 2px hsla(4, 60%, 40%, 0.25);
          left: var(--sx);
          top: var(--sy);
          opacity: 0;
          animation: wc-fly var(--dur) var(--del) linear infinite;
        }
        .wc-comet::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 0;
          transform: translateY(-50%) rotate(var(--a));
          transform-origin: right center;
          width: 50px;
          height: 1px;
          background: linear-gradient(to left, hsla(4, 60%, 40%, 0.4), transparent);
        }
        .wc-gold {
          background: hsl(38 100% 55%);
          box-shadow: 0 0 4px 1px hsla(38, 100%, 55%, 0.5), 0 0 12px 2px hsla(38, 100%, 55%, 0.2);
        }
        .wc-gold::after {
          background: linear-gradient(to left, hsla(38, 100%, 55%, 0.35), transparent);
        }
        @keyframes wc-fly {
          0% { opacity: 0; transform: translate(0,0); }
          5% { opacity: 0.7; }
          70% { opacity: 0.5; }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wc-comet { animation: none; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── COMPONENTS ───────────────────────────────────────────────────── */

function Glass({ children, className = '', style, id }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; id?: string }) {
  return <div id={id} className={`wc-glass ${className}`} style={style}><div className="relative z-[1]">{children}</div></div>;
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`wc-pill ${className}`}>{children}</div>;
}

function Stat({ value, text }: { value: string; text: string }) {
  return <div className="wc-stat"><strong dangerouslySetInnerHTML={{ __html: value }} /><span>{text}</span></div>;
}

function SectionHead({ pill, heading, text }: { pill: string; heading: string; text: string }) {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-4 md:items-end mb-6 md:mb-8">
      <div><Pill>{pill}</Pill><h2 className="wc-h2">{heading}</h2></div>
      <p className="wc-body max-w-[52ch]">{text}</p>
    </div>
  );
}
