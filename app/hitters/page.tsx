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
    <main className="hitters-root relative min-h-screen overflow-x-hidden bg-[#0B1D36] text-[#F8FAFC] antialiased">
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
            radial-gradient(1200px 600px at 80% -10%, rgba(200, 16, 46, 0.12), transparent 60%),
            radial-gradient(1000px 500px at 0% 30%, rgba(29, 78, 216, 0.1), transparent 55%),
            #0b1d36;
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
          background: rgba(200, 16, 46, 0.5);
          border-radius: 3px;
        }
        .hitters-root input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 9999px;
          background: #f8fafc;
          border: 3px solid #c8102e;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }
        .hitters-root input[type='range']::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 9999px;
          background: #f8fafc;
          border: 3px solid #c8102e;
          cursor: pointer;
        }
      `}</style>
    </main>
  );
}
