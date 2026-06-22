'use client';

import { SitePlanSpec, ZONE_COLORS } from '@/lib/sunvista/schemas';

// Renders a SitePlanSpec as a schematic CAD-style drawing sheet (SVG).
export function SitePlanSVG({ spec }: { spec: SitePlanSpec }) {
  const PAD = 8; // feet of padding around the drawing
  const W = spec.width + PAD * 2;
  const H = spec.height + PAD * 2;
  const TITLE_H = 10; // title block height in feet

  // Grid lines every 10 ft
  const gridLines: { x?: number; y?: number }[] = [];
  for (let x = 0; x <= spec.width; x += 10) gridLines.push({ x: x + PAD });
  for (let y = 0; y <= spec.height; y += 10) gridLines.push({ y: y + PAD });

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-[#0b1020]">
      <svg
        viewBox={`0 0 ${W} ${H + TITLE_H}`}
        className="h-auto w-full"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        {/* Sheet background */}
        <rect x={0} y={0} width={W} height={H + TITLE_H} fill="#0b1020" />

        {/* Grid */}
        {gridLines.map((g, i) =>
          g.x !== undefined ? (
            <line key={`gx${i}`} x1={g.x} y1={PAD} x2={g.x} y2={spec.height + PAD} stroke="#1b2a4a" strokeWidth={0.1} />
          ) : (
            <line key={`gy${i}`} x1={PAD} y1={g.y} x2={spec.width + PAD} y2={g.y} stroke="#1b2a4a" strokeWidth={0.1} />
          )
        )}

        {/* Drawing border */}
        <rect x={PAD} y={PAD} width={spec.width} height={spec.height} fill="none" stroke="#3b5687" strokeWidth={0.25} />

        {/* Zones */}
        {spec.zones.map((z) => (
          <g key={z.id}>
            <rect
              x={z.x + PAD}
              y={z.y + PAD}
              width={z.w}
              height={z.h}
              fill={ZONE_COLORS[z.type]}
              fillOpacity={0.55}
              stroke={ZONE_COLORS[z.type]}
              strokeWidth={0.3}
            />
            <text
              x={z.x + PAD + 0.8}
              y={z.y + PAD + 2.4}
              fontSize={1.5}
              fill="#e2e8f0"
              style={{ fontWeight: 600 }}
            >
              {z.label}
            </text>
          </g>
        ))}

        {/* Walls */}
        {spec.walls.map((w, i) => (
          <line
            key={`w${i}`}
            x1={w.x1 + PAD}
            y1={w.y1 + PAD}
            x2={w.x2 + PAD}
            y2={w.y2 + PAD}
            stroke="#cbd5e1"
            strokeWidth={0.5}
          />
        ))}

        {/* Dimensions */}
        {spec.dimensions.map((d, i) => (
          <g key={`d${i}`} stroke="#fbbf24" fill="#fbbf24">
            <line x1={d.x1 + PAD} y1={d.y1 + PAD} x2={d.x2 + PAD} y2={d.y2 + PAD} strokeWidth={0.15} />
            <circle cx={d.x1 + PAD} cy={d.y1 + PAD} r={0.4} />
            <circle cx={d.x2 + PAD} cy={d.y2 + PAD} r={0.4} />
            <text
              x={(d.x1 + d.x2) / 2 + PAD}
              y={(d.y1 + d.y2) / 2 + PAD - 0.6}
              fontSize={1.4}
              textAnchor="middle"
              stroke="none"
            >
              {d.label}
            </text>
          </g>
        ))}

        {/* Annotations */}
        {spec.annotations.map((a, i) => (
          <g key={`a${i}`}>
            <circle cx={a.x + PAD} cy={a.y + PAD} r={0.6} fill="#f97316" />
            <text x={a.x + PAD + 1.2} y={a.y + PAD + 0.5} fontSize={1.3} fill="#fdba74">
              {a.text}
            </text>
          </g>
        ))}

        {/* Title block */}
        <rect x={0} y={H} width={W} height={TITLE_H} fill="#11182a" stroke="#3b5687" strokeWidth={0.25} />
        <text x={2} y={H + 4} fontSize={2.4} fill="#ffffff" style={{ fontWeight: 700 }}>
          {spec.title}
        </text>
        <text x={2} y={H + 7.5} fontSize={1.5} fill="#94a3b8">
          {spec.address}
        </text>
        <text x={W - 2} y={H + 4} fontSize={1.6} fill="#fbbf24" textAnchor="end" style={{ fontWeight: 700 }}>
          SUNVISTA ENTERPRISES
        </text>
        <text x={W - 2} y={H + 7.5} fontSize={1.4} fill="#94a3b8" textAnchor="end">
          Scale {spec.scale} · Conceptual — refine in AutoCAD
        </text>
      </svg>
    </div>
  );
}
