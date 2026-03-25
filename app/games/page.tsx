'use client';

import { useState, useEffect } from 'react';

type ControlEntry = { label: string; key: string };

type EmulatorConfig = {
  romParam: string;
  core: string;
  color: string;
  virtualGamepad: Record<string, unknown>[];
};

type Game = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  touchControls: ControlEntry[];
  keyboardControls: ControlEntry[];
  touchNote: string;
  iframeType: 'src' | 'emulator';
  iframeSrc: string;
  emulatorConfig?: EmulatorConfig;
  iframeHeight: { mobile: number; desktop: number };
};

const games: Game[] = [
  {
    id: 'nba-jam',
    emoji: '\u{1F3C0}',
    title: 'NBA Jam',
    description: "He's on fire! The ultimate arcade basketball classic",
    touchControls: [
      { label: 'Move', key: 'Left joystick zone' },
      { label: 'SHOOT', key: 'Tap SHOOT' },
      { label: 'PASS', key: 'Tap PASS' },
      { label: 'TURBO', key: 'Tap TURBO' },
    ],
    keyboardControls: [
      { label: 'Move', key: 'Arrow Keys' },
      { label: 'Shoot / Block', key: 'Z' },
      { label: 'Pass / Steal', key: 'X' },
      { label: 'Turbo', key: 'A' },
      { label: 'Start', key: 'Enter' },
    ],
    touchNote: 'Rotate to landscape for best experience.',
    iframeType: 'emulator',
    iframeSrc: '',
    emulatorConfig: {
      romParam: 'nba-jam',
      core: 'snes',
      color: '#1e40af',
      virtualGamepad: [
        { type: 'zone', location: 'left', inputValues: [16, 17, 18, 19] },
        { type: 'button', location: 'right', inputValues: [0], label: 'SHOOT', fontSize: 10 },
        { type: 'button', location: 'right', inputValues: [8], label: 'PASS', fontSize: 10 },
        { type: 'button', location: 'right', inputValues: [9], label: 'TURBO', fontSize: 9 },
        { type: 'button', location: 'center', inputValues: [3], label: 'START', fontSize: 9 },
      ],
    },
    iframeHeight: { mobile: 350, desktop: 700 },
  },
  {
    id: 'tecmo-super-bowl',
    emoji: '\u{1F3C8}',
    title: 'Tecmo Super Bowl',
    description: 'The classic NES football game \u2014 play it right here',
    touchControls: [
      { label: 'D-Pad', key: 'Left joystick zone' },
      { label: 'A', key: 'Tap A button' },
      { label: 'B', key: 'Tap B button' },
      { label: 'Start', key: 'Tap START' },
    ],
    keyboardControls: [
      { label: 'Move', key: 'Arrow Keys' },
      { label: 'A Button', key: 'Z' },
      { label: 'B Button', key: 'X' },
      { label: 'Start', key: 'Enter' },
      { label: 'Select', key: 'Shift' },
    ],
    touchNote: 'Rotate to landscape for best experience.',
    iframeType: 'emulator',
    iframeSrc: '',
    emulatorConfig: {
      romParam: 'tecmo-super-bowl',
      core: 'nes',
      color: '#065f46',
      virtualGamepad: [
        { type: 'zone', location: 'left', inputValues: [16, 17, 18, 19] },
        { type: 'button', location: 'right', inputValues: [0], label: 'A', fontSize: 12 },
        { type: 'button', location: 'right', inputValues: [8], label: 'B', fontSize: 12 },
        { type: 'button', location: 'center', inputValues: [3], label: 'START', fontSize: 9 },
        { type: 'button', location: 'center', inputValues: [2], label: 'SELECT', fontSize: 8 },
      ],
    },
    iframeHeight: { mobile: 350, desktop: 700 },
  },
  {
    id: 'drive-mad',
    emoji: '\u{1F697}',
    title: 'Drive Mad',
    description: 'Navigate crazy tracks without flipping your ride',
    touchControls: [
      { label: 'Drive', key: 'Tap & drag on screen' },
      { label: 'Lean', key: 'Tilt or swipe left/right' },
    ],
    keyboardControls: [
      { label: 'Gas', key: 'W / Up Arrow' },
      { label: 'Brake', key: 'S / Down Arrow' },
      { label: 'Lean Left', key: 'A / Left Arrow' },
      { label: 'Lean Right', key: 'D / Right Arrow' },
    ],
    touchNote: 'Built for touch \u2014 just tap the game and play.',
    iframeType: 'src',
    iframeSrc: 'https://ubg77.github.io/game131022/drive-mad/',
    iframeHeight: { mobile: 400, desktop: 700 },
  },
  {
    id: 'reaction-trainer',
    emoji: '\u26A1',
    title: 'Reaction Trainer',
    description: 'Boost your reflexes and focus speed',
    touchControls: [],
    keyboardControls: [],
    touchNote: 'Tap to play \u2014 fully touch compatible',
    iframeType: 'src',
    iframeSrc: 'https://itch.io/embed-upload/10146142?color=333333',
    iframeHeight: { mobile: 350, desktop: 500 },
  },
  {
    id: 'physics-launcher',
    emoji: '\u{1F680}',
    title: 'Physics Launcher Lab',
    description: 'Learn motion and timing through gameplay',
    touchControls: [],
    keyboardControls: [],
    touchNote: 'Tap to play \u2014 fully touch compatible',
    iframeType: 'src',
    iframeSrc: 'https://itch.io/embed-upload/8895646?color=222222',
    iframeHeight: { mobile: 350, desktop: 500 },
  },
  {
    id: 'strategy-builder',
    emoji: '\u{1F9E0}',
    title: 'Strategy Builder',
    description: 'Practice decision making and upgrades',
    touchControls: [],
    keyboardControls: [],
    touchNote: 'Tap to play \u2014 fully touch compatible',
    iframeType: 'src',
    iframeSrc: 'https://itch.io/embed-upload/7574563?color=444444',
    iframeHeight: { mobile: 350, desktop: 500 },
  },
];

function buildEmulatorSrcDoc(config: EmulatorConfig, romUrl: string): string {
  return `<!DOCTYPE html>
<html><head><style>body{margin:0;overflow:hidden;background:#000}#game{width:100%;height:100%}</style></head>
<body><div id="game"></div>
<script>
  EJS_player="#game";
  EJS_gameUrl="${romUrl}";
  EJS_core="${config.core}";
  EJS_pathtodata="https://cdn.emulatorjs.org/stable/data/";
  EJS_startOnLoaded=true;
  EJS_color="${config.color}";
  EJS_VirtualGamepadSettings=${JSON.stringify(config.virtualGamepad)};
<\/script>
<script src="https://cdn.emulatorjs.org/stable/data/loader.js"><\/script>
</body></html>`;
}

function EmulatorFrame({ config, height }: { config: EmulatorConfig; height: string }) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const romUrl = `/api/games/rom?game=${config.romParam}`;

  useEffect(() => {
    fetch(romUrl, { method: 'HEAD' }).then(res => {
      setStatus(res.ok ? 'ready' : 'unavailable');
    }).catch(() => setStatus('unavailable'));
  }, [romUrl]);

  if (status === 'checking') {
    return (
      <div className="w-full flex items-center justify-center bg-black text-slate-400 text-sm" style={{ height }}>
        Loading game...
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-2 bg-black text-center px-4" style={{ height }}>
        <span className="text-2xl">🎮</span>
        <p className="text-slate-400 text-sm">Game ROM not available right now.</p>
        <p className="text-slate-500 text-xs">Check back soon — the ROM server may be offline.</p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={buildEmulatorSrcDoc(config, romUrl)}
      className="w-full border-none"
      style={{ height }}
      frameBorder={0}
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-popups"
      allow="cross-origin-isolated; gamepad"
    />
  );
}

function ControlBadge({ label, keyName }: { label: string; keyName: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-md text-xs sm:text-sm sm:gap-2 sm:px-3">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-200 text-[11px] sm:text-xs sm:px-2">
        {keyName}
      </span>
    </div>
  );
}

function GameCard({ game, isExpanded, onToggle }: { game: Game; isExpanded: boolean; onToggle: () => void }) {
  const hasControls = game.touchControls.length > 0 || game.keyboardControls.length > 0;

  return (
    <section className="bg-slate-800 rounded-xl overflow-hidden">
      {/* Header - always visible, tappable */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 sm:p-5 flex items-center justify-between"
      >
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <span>{game.emoji}</span>
            <span className="truncate">{game.title}</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5 line-clamp-1">{game.description}</p>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 shrink-0 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-3">
          {/* Controls */}
          {hasControls && (
            <div className="bg-slate-900 rounded-lg p-3 space-y-3 overflow-x-auto">
              {game.touchControls.length > 0 && (
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                    {'\u{1F4F1}'} Touch Controls
                  </h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {game.touchControls.map((c, i) => (
                      <ControlBadge key={i} label={c.label} keyName={c.key} />
                    ))}
                  </div>
                  {game.touchNote && (
                    <p className="text-slate-500 text-xs mt-2">{game.touchNote}</p>
                  )}
                </div>
              )}
              {game.keyboardControls.length > 0 && (
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                    {'\u{1F5A5}\uFE0F'} Keyboard Controls
                  </h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {game.keyboardControls.map((c, i) => (
                      <ControlBadge key={i} label={c.label} keyName={c.key} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Touch-only note for simple games */}
          {!hasControls && game.touchNote && (
            <p className="text-slate-500 text-xs bg-slate-900 rounded-lg px-3 py-2">
              {'\u{1F4F1}'} {game.touchNote}
            </p>
          )}

          {/* Game iframe */}
          <div className="rounded-lg overflow-hidden border-2 border-slate-700">
            {game.iframeType === 'emulator' && game.emulatorConfig ? (
              <EmulatorFrame
                config={game.emulatorConfig}
                height={`clamp(280px, 55vh, ${game.iframeHeight.desktop}px)`}
              />
            ) : (
              <iframe
                src={game.iframeSrc}
                className="w-full border-none"
                style={{ height: `clamp(280px, 55vh, ${game.iframeHeight.desktop}px)` }}
                frameBorder={0}
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                allow="gamepad; autoplay"
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function GamesPage() {
  const [expandedGame, setExpandedGame] = useState<string | null>('nba-jam');

  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-3xl sm:text-5xl font-bold">
            {'\u{1F3AE}'} Carter&apos;s Brain Arcade
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            Improve your skills while having fun
          </p>
        </div>

        {/* Game cards */}
        <div className="space-y-3 sm:space-y-4">
          {games.map(game => (
            <GameCard
              key={game.id}
              game={game}
              isExpanded={expandedGame === game.id}
              onToggle={() => setExpandedGame(prev => prev === game.id ? null : game.id)}
            />
          ))}
        </div>

        {/* Weekly Challenge */}
        <section className="mt-6 sm:mt-8 bg-slate-800 rounded-xl p-4 sm:p-5">
          <h2 className="text-lg sm:text-xl font-bold">
            {'\u{1F3C6}'} Weekly Challenge
          </h2>
          <p className="text-slate-400 text-sm mt-1">Submit your high score to win a prize!</p>
          <form className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3">
            <input
              placeholder="Username"
              className="flex-1 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <input
              placeholder="Score"
              className="flex-1 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-500 text-white font-medium rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              Submit
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
