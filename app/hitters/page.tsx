'use client';

import * as React from 'react';
import {
  Navbar, Hero, About, Teams, FeaturedPlayers, Schedule,
  Development, Tryouts, News, Footer, FloatingScoutButton,
} from './sections';
import { IntelligenceHub } from './ai';

export default function HittersPage() {
  const launchScout = React.useCallback(() => {
    const el = document.getElementById('intelligence');
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <main className="hitters-root relative min-h-screen overflow-x-hidden bg-[#0A0A0A] text-[#F8FAFC] antialiased">
      <Navbar onLaunch={launchScout} />
      <Hero onLaunch={launchScout} />
      <About />
      <IntelligenceHub id="intelligence" />
      <Teams />
      <FeaturedPlayers />
      <Schedule />
      <Development />
      <Tryouts />
      <News />
      <Footer />
      <FloatingScoutButton onClick={launchScout} />

      {/* Scoped styles for the Hitters experience */}
      <style jsx global>{`
        .hitters-root {
          background:
            radial-gradient(1100px 560px at 78% -12%, rgba(255, 255, 255, 0.07), transparent 60%),
            radial-gradient(900px 500px at 8% 28%, rgba(150, 156, 165, 0.06), transparent 55%),
            radial-gradient(1200px 800px at 50% 120%, rgba(255, 255, 255, 0.04), transparent 60%),
            #0a0a0a;
        }
        /* brushed-chrome text for headline accents */
        .h-chrome-text {
          background: linear-gradient(180deg, #ffffff 0%, #d7dade 48%, #9aa0a8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .hitters-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 75%);
        }
        .hitters-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .hitters-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.4);
          border-radius: 3px;
        }
        .hitters-root input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 9999px;
          background: #f8fafc;
          border: 3px solid #c9cdd2;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }
        .hitters-root input[type='range']::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 9999px;
          background: #f8fafc;
          border: 3px solid #c9cdd2;
          cursor: pointer;
        }
      `}</style>
    </main>
  );
}
