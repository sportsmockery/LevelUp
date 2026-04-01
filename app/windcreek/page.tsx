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
      el.className = 'wc-comet wc-comet-gold';
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

      {/* ── STORY ─────────────────────────────────────────── */}
      <main className="relative z-[1]">

        {/* HERO */}
        <section className="wc-hero">
          <R><div className="wc-eyebrow">Wind Creek Chicago Southland &middot; Partnership Proposal</div></R>
          <R><h1 className="wc-h1 mt-6 md:mt-8">Turn Culture Into Crowds. Turn Crowds Into&nbsp;Revenue.</h1></R>
          <R><p className="wc-lead mt-5 md:mt-6">A 3-night DJ competition produced by <strong className="text-white">Brand Breakers</strong>, bringing <strong className="text-white">900&ndash;1,200 high-energy attendees</strong> to Wind Creek&mdash;driven by real Chicago demand.</p></R>
          <R><p className="wc-muted mt-3">Built for turnout. Designed for spend. Measured for results.</p></R>
          <R>
            <div className="flex flex-wrap gap-3 mt-8 md:mt-10 justify-center">
              <a href="#investment" className="wc-cta">See the investment case</a>
              <a href="#event" className="wc-ghost">Walk the event</a>
            </div>
          </R>
        </section>

        {/* ── GILES TRAVIS — FEATURED ─────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Produced by</div></R>
          <R><h2 className="wc-h2">Produced by Giles Travis &mdash; Brand Breakers</h2></R>
          <R><p className="wc-body mt-1" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Founder, Brand Breakers &bull; Chicago Market Operator &bull; Viral Distribution Architect</p></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 md:gap-7 mt-6 md:mt-8 items-start">
              {/* Photo */}
              <div className="wc-giles-img mx-auto sm:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/giles-travis.jpg" alt="Giles Travis" className="w-full h-full object-cover" />
                <div className="wc-giles-overlay" />
              </div>
              {/* Bio */}
              <div>
                <p className="wc-body">Giles Travis, founder of Brand Breakers, specializes in turning cultural momentum into real-world turnout.</p>
                <p className="wc-body mt-3">Through the rise of &ldquo;Go Home Trav&rdquo; and viral Chicago fan content, he has already proven one thing: <strong className="text-white">he knows how to move people.</strong></p>
                <p className="wc-body mt-3">This event applies that same system: build attention organically, convert it into attendance, sustain it across multiple nights.</p>
                <p className="wc-body mt-3">This doesn&rsquo;t start with promotion. <strong className="text-white">It starts with an audience.</strong></p>
              </div>
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8" style={{ fontSize: 16 }}>
              &ldquo;When culture is already moving, the smartest brands don&rsquo;t chase it&mdash;they attach to the people creating it.&rdquo;
            </blockquote>
          </R>
          <R>
            <div className="wc-card wc-card-accent mt-6 text-center">
              <p className="text-white font-semibold text-[15px]">This isn&rsquo;t an event being promoted. It&rsquo;s momentum being activated.</p>
            </div>
          </R>
        </section>

        {/* ── THE EVENT ────────────────────────────────────── */}
        <section id="event" className="wc-s">
          <R><div className="wc-pill">The event</div></R>
          <R><h2 className="wc-h2">3 Nights. The City&rsquo;s Best DJs. One Winner.</h2></R>
          <R><p className="wc-body mt-4">Brand Breakers presents a 3-night DJ competition featuring some of the most talented DJs across Chicago.</p></R>
          <R><p className="wc-body mt-3">Each night builds momentum&mdash;leading to a final showdown where one DJ wins the grand prize.</p></R>
          <R><p className="wc-body mt-3">This isn&rsquo;t just entertainment. It&rsquo;s a structured, competitive experience designed to:</p></R>
          <R>
            <div className="space-y-3 mt-5">
              {[
                ['Drive repeat attendance', 'Fans come back each night to support their DJ.'],
                ['Keep energy high across all three nights', 'Competition format sustains momentum.'],
                ['Create a reason to stay, spend, and come back', 'Dwell time drives revenue.'],
              ].map(([t, d], i) => (
                <div key={i} className="wc-row"><strong>{t}</strong><span className="wc-muted">{d}</span></div>
              ))}
            </div>
          </R>
        </section>

        {/* ── ATTENDANCE ──────────────────────────────────── */}
        <section id="value" className="wc-s">
          <R><div className="wc-pill">Attendance</div></R>
          <R><h2 className="wc-h2">900&ndash;1,200 Attendees. Already Within Reach.</h2></R>
          <R><p className="wc-body mt-4">This event is built to deliver <strong className="text-white">900&ndash;1,200 attendees across three nights</strong>, fueled by:</p></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="wc-stat-mini">Existing Chicago nightlife demand</div>
              <div className="wc-stat-mini">Viral cultural momentum</div>
              <div className="wc-stat-mini">Competitive event structure</div>
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              This isn&rsquo;t traffic being chased. It&rsquo;s demand being activated.
            </blockquote>
          </R>
        </section>

        {/* ── REVENUE MODEL ───────────────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Revenue model</div></R>
          <R><h2 className="wc-h2">Every Attendee Drives Value</h2></R>
          <R><p className="wc-body mt-4">Casino revenue doesn&rsquo;t come from entry&mdash;it comes from dwell time and spend. Each attendee represents:</p></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="wc-stat-mini">Food &amp; beverage revenue</div>
              <div className="wc-stat-mini">Gaming participation</div>
              <div className="wc-stat-mini">Extended time on property</div>
            </div>
          </R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 md:mt-8">
              <div className="wc-card text-center">
                <div className="wc-big-sm">900 attendees</div>
                <div className="wc-accent text-xl md:text-2xl font-bold mt-2">$67,500 &ndash; $135,000</div>
                <div className="wc-muted text-sm mt-1">total value</div>
              </div>
              <div className="wc-card text-center">
                <div className="wc-big-sm">1,200 attendees</div>
                <div className="wc-gold-text text-xl md:text-2xl font-bold mt-2">$90,000 &ndash; $180,000</div>
                <div className="wc-muted text-sm mt-1">total value</div>
              </div>
            </div>
          </R>
          <R><p className="wc-muted text-center text-sm mt-3">Based on $75&ndash;$150 per attendee total spend</p></R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              This is baseline event revenue&mdash;before sponsorship and long-term customer value.
            </blockquote>
          </R>
        </section>

        {/* ── WHY THIS WORKS ──────────────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Casino mechanics</div></R>
          <R><h2 className="wc-h2">Built for How Casinos Actually Make Money</h2></R>
          <R><p className="wc-body mt-4">This event is engineered around:</p></R>
          <R>
            <div className="space-y-3 mt-5">
              {[
                ['Energy', 'Keeps people engaged longer.'],
                ['Competition', 'Creates repeat visits.'],
                ['Crowd density', 'Increases spend behavior.'],
              ].map(([t, d], i) => (
                <div key={i} className="wc-row"><strong>{t}</strong><span className="wc-muted">{d}</span></div>
              ))}
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              The longer they stay, the more they spend. This is designed for both.
            </blockquote>
          </R>
        </section>

        {/* ── MAKES THEIR JOB EASY ────────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Operational clarity</div></R>
          <R><h2 className="wc-h2">A Campaign You Don&rsquo;t Have to Defend</h2></R>
          <R><p className="wc-body mt-4">Marketing leaders are expected to deliver results&mdash;but rarely get clean ones. This changes that.</p></R>
          <R>
            <div className="space-y-3 mt-5">
              {[
                ['Clear attendance targets', 'Not vague impressions.'],
                ['Real, physical turnout', 'People in the building.'],
                ['Simple revenue math', 'Attendees times spend.'],
                ['Easy internal reporting', 'A strong story to leadership.'],
              ].map(([t, d], i) => (
                <div key={i} className="wc-row"><strong>{t}</strong><span className="wc-muted">{d}</span></div>
              ))}
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              No inflated metrics. No guesswork. Just results you can point to.
            </blockquote>
          </R>
        </section>

        {/* ── $200K INVESTMENT ─────────────────────────────── */}
        <section id="investment" className="wc-s">
          <R><div className="wc-pill">Investment case</div></R>
          <R><h2 className="wc-h2">Why $200K Is the Right Move</h2></R>
          <R><p className="wc-body mt-4">Casinos already spend heavily on:</p></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="wc-card-sm">Promotions with unclear return</div>
              <div className="wc-card-sm">Media that doesn&rsquo;t guarantee turnout</div>
              <div className="wc-card-sm">Events that rely on hope instead of demand</div>
            </div>
          </R>
          <R>
            <div className="wc-card wc-card-accent mt-6 md:mt-8">
              <div className="wc-muted text-xs uppercase tracking-widest mb-3 text-center">This is different</div>
              <div className="space-y-3">
                {[
                  'Known attendance range (900–1,200)',
                  'Built-in energy and competition',
                  'Measurable outcomes',
                ].map((t, i) => (
                  <div key={i} className="wc-row-simple wc-row-accent text-center">{t}</div>
                ))}
              </div>
            </div>
          </R>
          <R>
            <div className="wc-card wc-card-final mt-6 md:mt-8 text-center">
              <p className="wc-body mb-2">You&rsquo;re not paying $200K for a DJ event.</p>
              <p className="text-white text-lg md:text-xl font-bold leading-tight">You&rsquo;re investing in a controlled, high-energy crowd that drives revenue.</p>
            </div>
          </R>
        </section>

        {/* ── TOTAL VALUE ─────────────────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Long-term value</div></R>
          <R><h2 className="wc-h2">More Than One Weekend</h2></R>
          <R><p className="wc-body mt-4">The value doesn&rsquo;t stop when the event ends. This creates:</p></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              {['New customer acquisition', 'Future visit potential', 'Brand association with high-energy experience'].map((t, i) => (
                <div key={i} className="wc-card text-center"><div className="text-white font-semibold text-[14px]">{t}</div></div>
              ))}
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              The event is the start. The value continues.
            </blockquote>
          </R>
        </section>

        {/* ── COMPETITIVE EDGE ────────────────────────────── */}
        <section className="wc-s">
          <R><div className="wc-pill">Competitive advantage</div></R>
          <R><h2 className="wc-h2">Most Casinos Are Still Guessing</h2></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 md:mt-8">
              <div className="wc-card">
                <div className="wc-muted text-xs uppercase tracking-widest mb-4">Others rely on</div>
                <div className="space-y-2">
                  <div className="wc-row-simple">Discounts</div>
                  <div className="wc-row-simple">Generic promotions</div>
                  <div className="wc-row-simple">Low-energy traffic</div>
                </div>
              </div>
              <div className="wc-card wc-card-accent">
                <div className="wc-accent text-xs uppercase tracking-widest mb-4 font-semibold">This delivers</div>
                <div className="space-y-2">
                  <div className="wc-row-simple wc-row-accent">Real demand</div>
                  <div className="wc-row-simple wc-row-accent">High engagement</div>
                  <div className="wc-row-simple wc-row-accent">Repeatable model</div>
                </div>
              </div>
            </div>
          </R>
          <R>
            <blockquote className="wc-quote mt-6 md:mt-8">
              This is how you stand out in a crowded market.
            </blockquote>
          </R>
        </section>

        {/* ── CLOSE ───────────────────────────────────────── */}
        <section className="wc-s wc-s-final">
          <R><div className="wc-pill" style={{ justifyContent: 'center' }}>Next step</div></R>
          <R><h2 className="wc-h2 text-center">Own the Crowd. Own the Moment.</h2></R>
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 md:mt-8">
              {['900–1,200 attendees', '3 nights of sustained energy', 'Clear revenue opportunity'].map((t, i) => (
                <div key={i} className="wc-card text-center"><div className="text-white font-semibold text-[15px]">{t}</div></div>
              ))}
            </div>
          </R>
          <R>
            <div className="wc-card wc-card-final mt-8 md:mt-10 text-center">
              <p className="wc-body mb-2">$200K isn&rsquo;t the cost of the event.</p>
              <p className="text-white text-lg md:text-xl font-bold leading-tight">It&rsquo;s the cost of controlling a moment your competitors don&rsquo;t have.</p>
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

        .wc-logo-glow { animation: wc-glow 4s ease-in-out infinite; }
        @keyframes wc-glow {
          0%, 100% { filter: brightness(0) invert(1) drop-shadow(0 0 20px rgba(163,43,41,0.3)) drop-shadow(0 0 40px rgba(163,43,41,0.15)); }
          50% { filter: brightness(0) invert(1) drop-shadow(0 0 30px rgba(163,43,41,0.45)) drop-shadow(0 0 60px rgba(163,43,41,0.25)); }
        }

        .wc-sub {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.42); white-space: nowrap; margin-top: 6px;
        }
        @media (min-width: 768px) { .wc-sub { font-size: 14px; } }

        .wc-hero {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center;
          justify-content: flex-start; text-align: center;
          padding: 160px 20px 60px; max-width: 760px; margin: 0 auto;
        }
        @media (min-width: 768px) { .wc-hero { padding-top: 220px; } }

        .wc-s { max-width: 680px; margin: 0 auto; padding: 48px 20px; }
        @media (min-width: 768px) { .wc-s { padding: 72px 20px; } }
        .wc-s-final { padding-bottom: 80px; }
        @media (min-width: 768px) { .wc-s-final { padding-bottom: 120px; } }

        .wc-h1 {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: clamp(2rem, 1.4rem + 3vw, 3.6rem);
          line-height: 0.95; letter-spacing: -0.03em; font-weight: 700;
          color: #fff; max-width: 16ch;
        }
        .wc-h2 {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: clamp(1.5rem, 1.1rem + 1.6vw, 2.4rem);
          line-height: 1.05; letter-spacing: -0.02em; font-weight: 700; color: #fff;
        }
        .wc-lead { color: rgba(255,255,255,0.55); font-size: clamp(1rem, 0.9rem + 0.5vw, 1.2rem); line-height: 1.6; max-width: 52ch; }
        .wc-body { color: rgba(255,255,255,0.50); line-height: 1.65; }
        .wc-muted { color: rgba(255,255,255,0.35); }
        .wc-accent { color: #e8503e; }
        .wc-gold-text { color: #ffb43c; }

        .wc-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 7px 16px; border-radius: 999px;
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em;
          color: rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          font-weight: 500;
        }
        .wc-pill {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #e8503e; margin-bottom: 12px; font-weight: 600;
        }

        .wc-card {
          padding: 20px 22px; border-radius: 16px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }
        @media (min-width: 768px) { .wc-card { padding: 24px 28px; border-radius: 20px; } }
        .wc-card-accent { border-color: rgba(163,43,41,0.2); background: rgba(163,43,41,0.06); }
        .wc-card-final {
          border-color: rgba(163,43,41,0.25);
          background: linear-gradient(135deg, rgba(163,43,41,0.12), rgba(255,180,60,0.06));
          padding: 28px;
        }
        @media (min-width: 768px) { .wc-card-final { padding: 36px; } }

        .wc-card-sm {
          padding: 14px 18px; border-radius: 12px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.55); font-size: 14px;
        }
        .wc-stat-mini {
          padding: 10px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.50); font-size: 13px; font-weight: 500;
        }

        .wc-big-sm {
          font-family: 'General Sans', 'Inter', system-ui, sans-serif;
          font-size: 1.1rem; font-weight: 700;
          color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.06em;
        }

        .wc-quote {
          padding: 18px 22px;
          border-left: 2px solid rgba(163,43,41,0.4);
          border-radius: 0 12px 12px 0;
          background: rgba(163,43,41,0.04);
          color: rgba(255,255,255,0.55); font-size: 14px; line-height: 1.6; font-style: italic;
        }

        .wc-row {
          display: flex; flex-direction: column; gap: 4px;
          padding: 16px 20px; border-radius: 14px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); font-size: 14px;
        }
        .wc-row strong { color: #fff; }
        .wc-row-simple {
          padding: 10px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.45); font-size: 14px;
        }
        .wc-row-accent { border-color: rgba(163,43,41,0.15); color: rgba(255,255,255,0.65); }

        /* Giles photo */
        .wc-giles-img {
          width: 160px; height: 160px; border-radius: 18px; overflow: hidden; position: relative;
          box-shadow:
            -4px 0 20px rgba(0,212,255,0.10),
            4px 0 20px rgba(188,0,0,0.08),
            0 8px 30px rgba(0,0,0,0.3);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          flex-shrink: 0;
        }
        @media (min-width: 640px) { .wc-giles-img { width: 180px; height: 180px; border-radius: 20px; } }
        .wc-giles-img:hover {
          transform: scale(1.02);
          box-shadow:
            -6px 0 28px rgba(0,212,255,0.15),
            6px 0 28px rgba(188,0,0,0.12),
            0 12px 40px rgba(0,0,0,0.35);
        }
        .wc-giles-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 50%, rgba(5,5,5,0.5));
          pointer-events: none;
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
          transition: transform 0.2s, border-color 0.2s, background 0.2s; text-decoration: none;
        }
        .wc-cta:hover { transform: translateY(-1px); border-color: rgba(163,43,41,0.55); }
        .wc-ghost {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0 24px; min-height: 46px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          transition: transform 0.2s, border-color 0.2s; text-decoration: none;
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
        .wc-comet-gold { background: hsl(38 100% 55%); box-shadow: 0 0 4px 1px hsla(38,100%,55%,0.5), 0 0 12px 2px hsla(38,100%,55%,0.2); }
        .wc-comet-gold::after { background: linear-gradient(to left, hsla(38,100%,55%,0.35), transparent); }
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
