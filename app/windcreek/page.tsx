'use client';

import { useEffect, useRef, useState } from 'react';

/* ── CSS COMET PARTICLES ──────────────────────────────────────────── */

function Comets() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 35; i++) {
      const a = -30 - 30 * Math.random(), r = (a * Math.PI) / 180, t = 120 + 80 * Math.random();
      const el = document.createElement('div');
      el.className = 'wc-comet';
      el.style.cssText = `--dur:${8+14*Math.random()}s;--del:${30*Math.random()}s;--sx:${70*Math.random()}%;--sy:${50+50*Math.random()}%;--a:${a}deg;--tx:${Math.cos(r)*t}vw;--ty:${Math.sin(r)*t}vh`;
      c.appendChild(el);
    }
    for (let j = 0; j < 8; j++) {
      const a = -20 - 140 * Math.random(), r = (a * Math.PI) / 180, t = 100 + 100 * Math.random();
      const el = document.createElement('div');
      el.className = 'wc-comet wc-gold';
      el.style.cssText = `--dur:${10+12*Math.random()}s;--del:${35*Math.random()}s;--sx:${80*Math.random()}%;--sy:${100*Math.random()}%;--a:${a}deg;--tx:${Math.cos(r)*t}vw;--ty:${Math.sin(r)*t}vh`;
      c.appendChild(el);
    }
    return () => { c.innerHTML = ''; };
  }, []);
  return <div ref={ref} className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }} />;
}

/* ── SCROLL REVEAL ────────────────────────────────────────────────── */

function R({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.1 });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ease-out ${v ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>{children}</div>;
}

/* ── PAGE ──────────────────────────────────────────────────────────── */

export default function WindCreekPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 200);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="wc-page">
      <Comets />

      {/* ── FIXED CENTERED LOGO (masters-style) ──────────── */}
      <div className={`fixed top-3 md:top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-1 transition-opacity duration-300 ${scrolled ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center gap-4 md:gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-breakers-logo.svg" alt="The Brand Breakers" className="w-[160px] md:w-[220px] h-auto wc-logo-glow" style={{ filter: 'brightness(0) invert(1)' }} />
          <div className="w-px h-8 md:h-10 bg-white/20" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wind-creek-logo.svg" alt="Wind Creek Chicago Southland" className="w-[140px] md:w-[200px] h-auto wc-logo-glow" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        <span className="wc-sub">Championship Experience Proposal</span>
      </div>

      {/* ── STORY CONTENT (single column, centered) ──────── */}
      <main className="relative z-[1]">

        {/* HERO */}
        <section className="wc-hero">
          <R>
            <div className="wc-eyebrow">Wind Creek Chicago Southland &middot; Partnership Proposal</div>
          </R>
          <R>
            <h1 className="wc-h1 mt-6 md:mt-8">
              Turn 3-Night Guests Into Predictable Revenue&mdash;Without&nbsp;Guesswork
            </h1>
          </R>
          <R>
            <p className="wc-lead mt-5 md:mt-6">
              We deliver qualified guests worth <strong className="text-white">$900&ndash;$1,200 per stay</strong>, while giving your team the data, automation, and clarity to execute with confidence.
            </p>
          </R>
          <R>
            <p className="wc-muted mt-3">
              No more fragmented campaigns. No more unclear ROI. Just measurable, repeatable performance.
            </p>
          </R>
          <R>
            <div className="flex flex-wrap gap-3 mt-8 md:mt-10 justify-center">
              <a href="#investment" className="wc-cta">See the investment case</a>
              <a href="#value" className="wc-ghost">Walk the math</a>
            </div>
          </R>
        </section>

        {/* ── SECTION 2: VALUE PER GUEST ──────────────────── */}
        <section id="value" className="wc-s">
          <R><div className="wc-pill">Revenue model</div></R>
          <R><h2 className="wc-h2">Each Guest Is a Revenue Event</h2></R>
          <R>
            <p className="wc-body mt-4">
              Our model focuses on <strong className="text-white">3-night stay guests</strong>, with a proven value range of:
            </p>
          </R>
          <R>
            <div className="wc-card mt-6 md:mt-8 text-center">
              <div className="wc-big">$900 &ndash; $1,200</div>
              <div className="wc-muted mt-2">total value per guest</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                <div className="wc-stat-mini">Gaming activity</div>
                <div className="wc-stat-mini">Food &amp; beverage spend</div>
                <div className="wc-stat-mini">On-property engagement</div>
              </div>
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              This is not theoretical value&mdash;it aligns with real casino benchmarks for multi-day guests, where extended stays consistently outperform single-day traffic in total yield.
            </blockquote>
          </R>
        </section>

        {/* ── SECTION 3: SIMPLE MATH ─────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">The math</div></R>
          <R><h2 className="wc-h2">The Math Is Straightforward</h2></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 md:mt-8">
              <div className="wc-card text-center">
                <div className="wc-big-sm">200 guests</div>
                <div className="wc-accent text-xl md:text-2xl font-bold mt-2">$180K &ndash; $240K</div>
                <div className="wc-muted text-sm mt-1">total value</div>
              </div>
              <div className="wc-card text-center">
                <div className="wc-big-sm">300 guests</div>
                <div className="wc-gold-text text-xl md:text-2xl font-bold mt-2">$270K &ndash; $360K</div>
                <div className="wc-muted text-sm mt-1">total value</div>
              </div>
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              At scale, this becomes a predictable revenue channel&mdash;not a campaign.
            </blockquote>
          </R>
        </section>

        {/* ── SECTION 4: JOB EASIER ──────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Operational clarity</div></R>
          <R><h2 className="wc-h2">Built to Make Marketing Easier&mdash;Not More Complex</h2></R>
          <R>
            <div className="space-y-4 mt-6 md:mt-8">
              {[
                ['Pre-qualified guests', 'No wasted spend chasing low-value traffic.'],
                ['Clear value per guest', 'Every campaign ties directly to revenue.'],
                ['Reduced reporting friction', 'Simple, defensible ROI for leadership.'],
                ['Less dependency on fragmented channels', 'Replace guesswork with structured inflow.'],
                ['Operational clarity', "Know what's working without digging through dashboards."],
              ].map(([t, d], i) => (
                <R key={i}>
                  <div className="wc-row">
                    <strong>{t}</strong>
                    <span className="wc-muted">{d}</span>
                  </div>
                </R>
              ))}
            </div>
          </R>
        </section>

        {/* ── SECTION 5: PAIN POINT ──────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Current reality</div></R>
          <R><h2 className="wc-h2">What This Replaces</h2></R>
          <R>
            <p className="wc-body mt-4">Today&rsquo;s casino marketing teams deal with:</p>
          </R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              {['Disconnected campaigns', 'Unclear attribution', 'Pressure to justify spend', 'Constant optimization cycles'].map((t, i) => (
                <div key={i} className="wc-card-sm">{t}</div>
              ))}
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              This replaces complexity with clarity&mdash;and turns your role from reactive to strategic.
            </blockquote>
          </R>
        </section>

        {/* ── SECTION 6: $200K INVESTMENT ─────────────────── */}
        <section id="investment" className="wc-s">
          <R><div className="wc-pill">Investment case</div></R>
          <R><h2 className="wc-h2">Why $200K Is a Strategic Investment</h2></R>
          <R>
            <p className="wc-body mt-4">Casino operators routinely invest in:</p>
          </R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="wc-card text-center">
                <div className="wc-muted text-xs uppercase tracking-widest mb-2">Slot machines</div>
                <div className="text-white text-lg md:text-xl font-bold">$15K&ndash;$25K</div>
                <div className="wc-muted text-sm mt-1">per unit</div>
              </div>
              <div className="wc-card text-center">
                <div className="wc-muted text-xs uppercase tracking-widest mb-2">Software &amp; data</div>
                <div className="text-white text-lg md:text-xl font-bold">$250K&ndash;$1M+</div>
                <div className="wc-muted text-sm mt-1">annually</div>
              </div>
              <div className="wc-card text-center">
                <div className="wc-muted text-xs uppercase tracking-widest mb-2">Promotions &amp; comps</div>
                <div className="text-white text-lg md:text-xl font-bold">Unclear</div>
                <div className="wc-muted text-sm mt-1">ROI</div>
              </div>
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6">
              The difference: those investments don&rsquo;t guarantee outcomes.
            </blockquote>
          </R>
          <R>
            <div className="wc-card wc-card-accent mt-6 md:mt-8 text-center">
              <div className="wc-muted text-xs uppercase tracking-widest mb-3">This investment is tied to</div>
              <div className="space-y-2">
                <p className="text-white font-semibold">Guest acquisition with known value ($900&ndash;$1,200 each)</p>
                <p className="text-white font-semibold">Predictable revenue modeling</p>
                <p className="text-white font-semibold">Reduced inefficiency in marketing spend</p>
              </div>
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              At just ~200&ndash;250 incremental guests, this initiative can fully return its cost&mdash;while continuing to generate value beyond that threshold.
            </blockquote>
          </R>
        </section>

        {/* ── SECTION 7: MEASURABLE ──────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Accountability</div></R>
          <R><h2 className="wc-h2">Designed for Measurable Performance</h2></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 md:mt-8">
              {['Every guest tracked', 'Every outcome tied to value', 'Every campaign measurable'].map((t, i) => (
                <div key={i} className="wc-card text-center">
                  <div className="text-white font-semibold">{t}</div>
                </div>
              ))}
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              No black box. No ambiguity. Just performance you can stand behind.
            </blockquote>
          </R>
        </section>

        {/* ── SECTION 8: COMPETITIVE EDGE ────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Competitive advantage</div></R>
          <R><h2 className="wc-h2">Most Casinos Are Still Guessing</h2></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 md:mt-8">
              <div className="wc-card">
                <div className="wc-muted text-xs uppercase tracking-widest mb-4">Others rely on</div>
                <div className="space-y-2">
                  <div className="wc-row-simple">Broad targeting</div>
                  <div className="wc-row-simple">Legacy marketing channels</div>
                  <div className="wc-row-simple">Delayed reporting</div>
                </div>
              </div>
              <div className="wc-card wc-card-accent">
                <div className="wc-accent text-xs uppercase tracking-widest mb-4 font-semibold">This system delivers</div>
                <div className="space-y-2">
                  <div className="wc-row-simple wc-row-accent">Structured inflow</div>
                  <div className="wc-row-simple wc-row-accent">Real-time visibility</div>
                  <div className="wc-row-simple wc-row-accent">Higher-value guests</div>
                </div>
              </div>
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              This isn&rsquo;t incremental improvement&mdash;it&rsquo;s a shift in how demand is created.
            </blockquote>
          </R>
        </section>

        {/* ── SECTION 9: CLOSE ───────────────────────────── */}
        <section className="wc-s wc-s-final">
          <R><div className="wc-pill" style={{ justifyContent: 'center' }}>Next step</div></R>
          <R><h2 className="wc-h2 text-center">A Smarter Way to Drive Revenue</h2></R>
          <R>
            <p className="wc-body mt-4 text-center max-w-[48ch] mx-auto">
              You&rsquo;re not being asked to spend more. You&rsquo;re being given a way to:
            </p>
          </R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 md:mt-8">
              {['Make your results predictable', 'Make your reporting easier', 'Make your impact undeniable'].map((t, i) => (
                <div key={i} className="wc-card text-center">
                  <div className="text-white font-semibold text-[15px]">{t}</div>
                </div>
              ))}
            </div>
          </R>
          <R>
            <div className="wc-card wc-card-final mt-8 md:mt-10 text-center">
              <p className="text-white text-lg md:text-xl font-bold leading-tight">
                $200K isn&rsquo;t the cost&mdash;it&rsquo;s the entry point to a repeatable revenue system.
              </p>
            </div>
          </R>
          <R>
            <div className="flex flex-wrap gap-3 mt-8 md:mt-10 justify-center">
              <a href="mailto:marketing@thebrandbreakers.com?subject=Wind%20Creek%20Partnership" className="wc-cta">Start the conversation</a>
            </div>
          </R>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-[1] max-w-[680px] mx-auto px-5 pb-10 md:pb-14">
        <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/[0.06]">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-breakers-logo.svg" alt="The Brand Breakers" className="w-[120px] h-auto opacity-35" style={{ filter: 'brightness(0) invert(1)' }} />
            <div className="w-px h-5 bg-white/10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wind-creek-logo.svg" alt="Wind Creek" className="w-[110px] h-auto opacity-35" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <div className="wc-muted text-xs text-center leading-relaxed">
            <p>Prepared by The Brand Breakers for Wind Creek Chicago Southland</p>
            <p className="opacity-60 mt-1">marketing@thebrandbreakers.com &middot; (312) 358-3378 &middot; Confidential 2026</p>
          </div>
        </div>
      </footer>

      {/* ── STYLES ─────────────────────────────────────────── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap');

        .wc-page {
          min-height: 100vh;
          color: #e8ecf2;
          overflow-x: hidden;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          background:
            radial-gradient(circle at 15% 20%, rgba(163,43,41,0.14), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(255,180,60,0.08), transparent 28%),
            radial-gradient(circle at 50% 78%, rgba(163,43,41,0.05), transparent 30%),
            #050505;
        }
        .wc-page::before {
          content: "";
          position: fixed; inset: 0; pointer-events: none;
          background:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: radial-gradient(circle at center, black 40%, transparent 85%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 85%);
          opacity: 0.3;
        }

        /* Logo glow */
        .wc-logo-glow { animation: wc-glow 4s ease-in-out infinite; }
        @keyframes wc-glow {
          0%, 100% { filter: brightness(0) invert(1) drop-shadow(0 0 20px rgba(163,43,41,0.3)) drop-shadow(0 0 40px rgba(163,43,41,0.15)); }
          50% { filter: brightness(0) invert(1) drop-shadow(0 0 30px rgba(163,43,41,0.45)) drop-shadow(0 0 60px rgba(163,43,41,0.25)); }
        }

        /* Subtitle under logos */
        .wc-sub {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.42);
          white-space: nowrap;
          margin-top: 6px;
        }
        @media (min-width: 768px) { .wc-sub { font-size: 14px; } }

        /* Hero — single column centered, pushed below fixed logo */
        .wc-hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          padding: 160px 20px 60px;
          max-width: 760px;
          margin: 0 auto;
        }
        @media (min-width: 768px) { .wc-hero { padding-top: 220px; } }

        /* Sections — single column centered */
        .wc-s {
          max-width: 680px;
          margin: 0 auto;
          padding: 48px 20px;
        }
        @media (min-width: 768px) { .wc-s { padding: 72px 20px; } }
        .wc-s-final { padding-bottom: 80px; }
        @media (min-width: 768px) { .wc-s-final { padding-bottom: 120px; } }

        /* Typography */
        .wc-h1 {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: clamp(2rem, 1.4rem + 3vw, 3.6rem);
          line-height: 0.95;
          letter-spacing: -0.03em;
          font-weight: 700;
          color: #fff;
          max-width: 16ch;
        }
        .wc-h2 {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: clamp(1.5rem, 1.1rem + 1.6vw, 2.4rem);
          line-height: 1.05;
          letter-spacing: -0.02em;
          font-weight: 700;
          color: #fff;
        }
        .wc-lead { color: rgba(255,255,255,0.55); font-size: clamp(1rem, 0.9rem + 0.5vw, 1.2rem); line-height: 1.6; max-width: 52ch; }
        .wc-body { color: rgba(255,255,255,0.50); line-height: 1.65; }
        .wc-muted { color: rgba(255,255,255,0.35); }
        .wc-accent { color: #e8503e; }
        .wc-gold-text { color: #ffb43c; }

        /* Eyebrow */
        .wc-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 7px 16px; border-radius: 999px;
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em;
          color: rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          font-weight: 500;
        }

        /* Pill label */
        .wc-pill {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #e8503e; margin-bottom: 12px; font-weight: 600;
        }

        /* Cards */
        .wc-card {
          padding: 20px 22px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        @media (min-width: 768px) { .wc-card { padding: 24px 28px; border-radius: 20px; } }

        .wc-card-accent {
          border-color: rgba(163,43,41,0.2);
          background: rgba(163,43,41,0.06);
        }
        .wc-card-final {
          border-color: rgba(163,43,41,0.25);
          background: linear-gradient(135deg, rgba(163,43,41,0.12), rgba(255,180,60,0.06));
          padding: 28px;
        }
        @media (min-width: 768px) { .wc-card-final { padding: 36px; } }

        .wc-card-sm {
          padding: 14px 18px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.55);
          font-size: 14px;
        }
        .wc-stat-mini {
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.50);
          font-size: 13px;
          font-weight: 500;
        }

        /* Big numbers */
        .wc-big {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: clamp(2rem, 1.4rem + 2.5vw, 3.2rem);
          font-weight: 800;
          color: #e8503e;
          letter-spacing: -0.02em;
        }
        .wc-big-sm {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(255,255,255,0.55);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Quote */
        .wc-quote {
          padding: 18px 22px;
          border-left: 2px solid rgba(163,43,41,0.4);
          border-radius: 0 12px 12px 0;
          background: rgba(163,43,41,0.04);
          color: rgba(255,255,255,0.55);
          font-size: 14px;
          line-height: 1.6;
          font-style: italic;
        }

        /* Rows */
        .wc-row {
          display: flex; flex-direction: column; gap: 4px;
          padding: 16px 20px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          font-size: 14px;
        }
        .wc-row strong { color: #fff; }
        .wc-row-simple {
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.45);
          font-size: 14px;
        }
        .wc-row-accent {
          border-color: rgba(163,43,41,0.15);
          color: rgba(255,255,255,0.65);
        }

        /* Buttons */
        .wc-cta {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0 24px; min-height: 46px; border-radius: 999px;
          border: 1px solid rgba(163,43,41,0.35);
          color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
          background: linear-gradient(135deg, rgba(163,43,41,0.22), rgba(232,80,62,0.10));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 30px rgba(0,0,0,0.2);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
          text-decoration: none;
        }
        .wc-cta:hover { transform: translateY(-1px); border-color: rgba(163,43,41,0.55); }
        .wc-ghost {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0 24px; min-height: 46px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          transition: transform 0.2s, border-color 0.2s;
          text-decoration: none;
        }
        .wc-ghost:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.18); }

        /* Comets */
        .wc-comet {
          position: absolute; width: 2px; height: 2px; border-radius: 50%;
          background: hsl(4 60% 40%);
          box-shadow: 0 0 4px 1px hsla(4,60%,40%,0.5), 0 0 12px 2px hsla(4,60%,40%,0.25);
          left: var(--sx); top: var(--sy); opacity: 0;
          animation: wc-fly var(--dur) var(--del) linear infinite;
        }
        .wc-comet::after {
          content: ''; position: absolute; top: 50%; right: 0;
          transform: translateY(-50%) rotate(var(--a)); transform-origin: right center;
          width: 50px; height: 1px;
          background: linear-gradient(to left, hsla(4,60%,40%,0.4), transparent);
        }
        .wc-gold { background: hsl(38 100% 55%); box-shadow: 0 0 4px 1px hsla(38,100%,55%,0.5), 0 0 12px 2px hsla(38,100%,55%,0.2); }
        .wc-gold::after { background: linear-gradient(to left, hsla(38,100%,55%,0.35), transparent); }
        @keyframes wc-fly {
          0% { opacity: 0; transform: translate(0,0); }
          5% { opacity: 0.7; }
          70% { opacity: 0.5; }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wc-comet { animation: none; opacity: 0; }
          .wc-logo-glow { animation: none; }
        }
      `}</style>
    </div>
  );
}
