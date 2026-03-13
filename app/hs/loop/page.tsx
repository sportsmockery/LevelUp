'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---

interface LoopConfig {
  source_dir: string;
  interval_seconds: number;
  enable_augmentation: boolean;
  num_variants: number;
  modality: string;
  detector_confidence: number;
  auto_fetch_datasets: boolean;
}

interface ImageScoreData {
  filename: string;
  timestamp: string;
  pass_index: number;
  contact_count: number;
  flagged_count: number;
  labels: string[];
  clinical_details: { clinical_label: string; clinical_confidence: number }[];
  augment_results?: { transforms: { transform: string }[]; consistent: boolean }[];
  consistency_ok?: boolean | null;
}

interface PassData {
  pass_index: number;
  timestamp: string;
  config: LoopConfig;
  image_count: number;
  total_contacts: number;
  flagged_count: number;
  label_distribution: Record<string, number>;
  consistency_mismatches: number;
  image_scores: ImageScoreData[];
  duration_seconds: number;
}

interface LoopStatus {
  running: boolean;
  current_pass: number;
  current_image: string;
  current_image_index: number;
  total_images: number;
  passes: PassData[];
  errors: string[];
  config: LoopConfig | null;
}

interface TrendPoint {
  iteration: number;
  mean_score: number;
  mean_iou: number;
  mean_drift: number;
  platinum: number;
  gold: number;
  silver: number;
  reject: number;
}

interface ModalityGap {
  iteration: number;
  iou_gap_pct: number;
  mean_drift: number;
  images: number;
}

interface HardSample {
  filename: string;
  modality: string;
  reject_count: number;
  worst_score: number;
  quality: { blur_score: number; contrast_score: number; occlusion_density: number };
}

interface ScatterPoint {
  yolo: number;
  sam: number;
  tier: string;
  class: string;
}

interface CommandCenterData {
  iterations: number;
  trend: TrendPoint[];
  latest: {
    iteration: number;
    images: number;
    detections: number;
    platinum: number;
    gold: number;
    silver: number;
    reject: number;
    mean_score: number;
    mean_iou: number;
    mean_drift: number;
    mean_yolo_conf: number;
    mean_sam_score: number;
    duration: number;
  } | null;
  modality_gaps: Record<string, ModalityGap[]>;
  hard_samples: HardSample[];
  overconfident_failures: object[];
  scatter_data: ScatterPoint[];
}

// --- Tier colors ---
const TIER_COLORS = {
  PLATINUM: { text: 'text-purple-300', bg: 'bg-purple-900/40 border-purple-700', bar: 'bg-purple-500' },
  GOLD: { text: 'text-yellow-300', bg: 'bg-yellow-900/40 border-yellow-700', bar: 'bg-yellow-500' },
  SILVER: { text: 'text-zinc-300', bg: 'bg-zinc-700/40 border-zinc-500', bar: 'bg-zinc-400' },
  REJECT: { text: 'text-red-400', bg: 'bg-red-900/40 border-red-700', bar: 'bg-red-500' },
};

const MOD_COLORS: Record<string, string> = {
  bitewing: 'text-red-400',
  intraoral_photo: 'text-blue-400',
  periapical: 'text-yellow-400',
  unknown: 'text-zinc-500',
};

const MOD_BAR_COLORS: Record<string, string> = {
  bitewing: 'bg-red-500',
  intraoral_photo: 'bg-blue-500',
  periapical: 'bg-yellow-500',
  unknown: 'bg-zinc-500',
};

const LABEL_PILL: Record<string, string> = {
  normal_contact: 'bg-emerald-700 text-emerald-100',
  open_contact: 'bg-red-700 text-red-100',
  unclear_contact: 'bg-yellow-700 text-yellow-100',
};

// --- Components ---

function StatCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
      <div className={`text-2xl font-heading ${color || ''}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 bg-zinc-800 rounded-full h-3 overflow-hidden">
      <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// --- Page ---

export default function CommandCenterPage() {
  const [status, setStatus] = useState<LoopStatus | null>(null);
  const [ccData, setCcData] = useState<CommandCenterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'loop' | 'drift' | 'hard' | 'modality'>('loop');
  const [expandedPass, setExpandedPass] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Config
  const [sourceDir, setSourceDir] = useState('data/raw/train/images');
  const [interval, setInterval_] = useState(60);
  const [augEnabled, setAugEnabled] = useState(false);
  const [numVariants, setNumVariants] = useState(3);
  const [modality, setModality] = useState('intraoral_photo');
  const [detConf, setDetConf] = useState(0.3);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, ccRes] = await Promise.all([
        fetch('/api/hs/loop'),
        fetch('/api/hs/loop?view=command-center'),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (ccRes.ok) setCcData(await ccRes.json());
      setError(null);
    } catch {
      setError('Cannot reach services');
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const ms = status?.running ? 2000 : 15000;
    pollRef.current = setInterval(fetchAll, ms);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status?.running, fetchAll]);

  const handleStart = async () => {
    await fetch('/api/hs/loop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', config: {
        source_dir: sourceDir, interval_seconds: interval,
        enable_augmentation: augEnabled, num_variants: numVariants,
        modality, detector_confidence: detConf, auto_fetch_datasets: true,
      }}),
    });
    fetchAll();
  };

  const handleStop = async () => {
    await fetch('/api/hs/loop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    fetchAll();
  };

  const isRunning = status?.running ?? false;
  const passes = status?.passes ?? [];
  const latestPass = passes.length > 0 ? passes[passes.length - 1] : null;
  const allScores = latestPass?.image_scores ?? [];
  const trend = ccData?.trend ?? [];
  const latest = ccData?.latest;
  const modalityGaps = ccData?.modality_gaps ?? {};
  const hardSamples = ccData?.hard_samples ?? [];
  const scatterData = ccData?.scatter_data ?? [];

  // Aggregate from latest pass
  const labelDist = latestPass?.label_distribution ?? {};
  const maxLabelCount = Math.max(1, ...Object.values(labelDist));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading tracking-tighter">COMMAND CENTER</h1>
            {isRunning && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            )}
            {latest && (
              <span className="text-zinc-500 text-sm ml-4">
                Iteration #{latest.iteration} | {ccData?.iterations ?? 0} total
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfigOpen(!configOpen)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              Config
            </button>
            {isRunning ? (
              <button onClick={handleStop}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                Stop
              </button>
            ) : (
              <button onClick={handleStart}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                Start
              </button>
            )}
          </div>
        </div>

        {/* Config Panel */}
        {configOpen && (
          <div className="max-w-6xl mx-auto mt-4 bg-zinc-900 rounded-2xl p-6 border border-zinc-800 grid grid-cols-3 gap-4">
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Source Directory</label>
              <input value={sourceDir} onChange={e => setSourceDir(e.target.value)}
                className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm text-white border border-zinc-700" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Interval (sec)</label>
              <input type="number" value={interval} onChange={e => setInterval_(Number(e.target.value))}
                className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm text-white border border-zinc-700" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Modality</label>
              <select value={modality} onChange={e => setModality(e.target.value)}
                className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm text-white border border-zinc-700">
                <option value="intraoral_photo">Intraoral Photo</option>
                <option value="bitewing">Bitewing X-ray</option>
                <option value="periapical">Periapical</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Confidence</label>
              <input type="number" step="0.05" min="0.1" max="0.9" value={detConf}
                onChange={e => setDetConf(Number(e.target.value))}
                className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm text-white border border-zinc-700" />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer pt-5">
              <input type="checkbox" checked={augEnabled} onChange={e => setAugEnabled(e.target.checked)}
                className="accent-[#2563EB]" />
              Augmentation ({numVariants} variants)
            </label>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto mt-4 flex gap-2">
          {(['loop', 'drift', 'hard', 'modality'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-[#2563EB] text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}>
              {tab === 'loop' ? 'Scoring Loop' : tab === 'drift' ? 'Drift Analytics' : tab === 'hard' ? 'Hard Samples' : 'Modality Gaps'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{error}</div>
        )}

        {/* Live Progress */}
        {isRunning && status && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-heading">Pass #{status.current_pass}</h2>
              <span className="text-zinc-400 text-sm">{status.current_image_index}/{status.total_images}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
              <div className="bg-[#2563EB] h-2 rounded-full transition-all"
                style={{ width: `${status.total_images > 0 ? (status.current_image_index / status.total_images) * 100 : 0}%` }} />
            </div>
            <p className="text-zinc-500 text-xs">{status.current_image}</p>
          </div>
        )}

        {/* ==================== TAB: SCORING LOOP ==================== */}
        {activeTab === 'loop' && (
          <>
            {/* Stats Row */}
            {latestPass && (
              <div className="grid grid-cols-5 gap-3">
                <StatCard value={latestPass.image_count} label="Images" />
                <StatCard value={latestPass.total_contacts} label="Contacts" />
                <StatCard value={latestPass.flagged_count} label="Flagged" color="text-red-400" />
                <StatCard value={latestPass.total_contacts > 0 ? `${((latestPass.flagged_count / latestPass.total_contacts) * 100).toFixed(1)}%` : '0%'} label="Flag Rate" />
                <StatCard value={`${latestPass.duration_seconds}s`} label="Duration" />
              </div>
            )}

            {/* Label Distribution */}
            {Object.keys(labelDist).length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4">Label Distribution</h2>
                <div className="space-y-2">
                  {Object.entries(labelDist).sort(([,a],[,b]) => b - a).map(([label, count]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 w-32 text-right truncate">{label.replace(/_/g, ' ')}</span>
                      <MiniBar value={count} max={maxLabelCount} color="bg-blue-500" />
                      <span className="text-xs text-zinc-500 w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results Feed */}
            {allScores.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4">Results Feed</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {[...allScores].reverse().slice(0, 50).map((score, i) => (
                    <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300 text-sm truncate max-w-40">{score.filename}</span>
                        {score.augment_results && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-800 text-purple-200">AUG</span>}
                        {score.consistency_ok === true && <span className="text-emerald-400 text-xs">&#10003;</span>}
                        {score.consistency_ok === false && <span className="text-yellow-400 text-xs">&#9888;</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs">{score.contact_count}c</span>
                        {score.flagged_count > 0 && <span className="text-red-400 text-xs">{score.flagged_count}f</span>}
                        {score.labels.slice(0, 3).map((l, j) => (
                          <span key={j} className={`text-xs px-1.5 py-0.5 rounded-full ${LABEL_PILL[l] || 'bg-zinc-600 text-zinc-200'}`}>
                            {l.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pass History */}
            {passes.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4">Pass History</h2>
                <div className="space-y-2">
                  {[...passes].reverse().slice(0, 20).map(pass => (
                    <div key={pass.pass_index}
                      className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 cursor-pointer hover:bg-zinc-750"
                      onClick={() => setExpandedPass(expandedPass === pass.pass_index ? null : pass.pass_index)}>
                      <div className="flex items-center gap-4">
                        <span className="text-zinc-300 font-medium">#{pass.pass_index}</span>
                        <span className="text-zinc-500 text-xs">{new Date(pass.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-zinc-500">{pass.image_count} imgs</span>
                        {pass.flagged_count > 0 && <span className="text-red-400">{pass.flagged_count} flagged</span>}
                        <span className="text-zinc-500">{pass.duration_seconds}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB: DRIFT ANALYTICS ==================== */}
        {activeTab === 'drift' && (
          <>
            {/* Latest iteration stats */}
            {latest && (
              <div className="grid grid-cols-6 gap-3">
                <StatCard value={latest.mean_score.toFixed(3)} label="Mean S_final" color="text-emerald-400" />
                <StatCard value={latest.mean_iou.toFixed(3)} label="Mean IoU" color="text-blue-400" />
                <StatCard value={`${latest.mean_drift.toFixed(1)}px`} label="Mean Drift" color="text-amber-400" />
                <StatCard value={latest.platinum} label="Platinum" color="text-purple-400" />
                <StatCard value={latest.gold} label="Gold" color="text-yellow-400" />
                <StatCard value={latest.reject} label="Reject" color="text-red-400" />
              </div>
            )}

            {/* Tier Distribution Bars */}
            {latest && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4">Tier Distribution (Iteration #{latest.iteration})</h2>
                <div className="space-y-3">
                  {(['PLATINUM', 'GOLD', 'SILVER', 'REJECT'] as const).map(tier => {
                    const count = tier === 'PLATINUM' ? latest.platinum : tier === 'GOLD' ? latest.gold : tier === 'SILVER' ? latest.silver : latest.reject;
                    const total = latest.platinum + latest.gold + latest.silver + latest.reject;
                    return (
                      <div key={tier} className="flex items-center gap-3">
                        <span className={`text-xs w-20 text-right ${TIER_COLORS[tier].text}`}>{tier}</span>
                        <MiniBar value={count} max={total} color={TIER_COLORS[tier].bar} />
                        <span className="text-xs text-zinc-500 w-12">{count} ({total > 0 ? ((count/total)*100).toFixed(0) : 0}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Score Trend */}
            {trend.length > 1 && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4">Score Trend Across Iterations</h2>
                <div className="flex items-end gap-1 h-32">
                  {trend.map((t, i) => {
                    const barH = Math.max(4, t.mean_score * 120);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-zinc-500">{t.mean_score.toFixed(2)}</span>
                        <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${barH}px` }} />
                        <span className="text-xs text-zinc-600">#{t.iteration}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-6 text-xs text-zinc-500">
                  <span>IoU trend: {trend.length > 1 ? (trend[trend.length-1].mean_iou > trend[0].mean_iou ? '↑ improving' : '↓ degrading') : '—'}</span>
                  <span>Drift trend: {trend.length > 1 ? (trend[trend.length-1].mean_drift < trend[0].mean_drift ? '↓ converging' : '↑ diverging') : '—'}</span>
                </div>
              </div>
            )}

            {/* Scatter: YOLO conf vs SAM stability */}
            {scatterData.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-2">YOLO Confidence vs SAM2 Stability</h2>
                <p className="text-xs text-zinc-500 mb-4">Red zone = overconfident failures (high YOLO, low SAM)</p>
                <div className="relative h-64 border border-zinc-700 rounded-xl overflow-hidden">
                  {/* Danger zone overlay */}
                  <div className="absolute right-0 bottom-0 w-1/4 h-2/5 bg-red-900/20 border-l border-t border-red-800/30" />
                  <div className="absolute left-1 top-1 text-xs text-zinc-600">SAM ↑</div>
                  <div className="absolute right-1 bottom-1 text-xs text-zinc-600">YOLO →</div>
                  {scatterData.map((pt, i) => {
                    const x = pt.yolo * 95;
                    const y = (1 - pt.sam) * 95;
                    const color = pt.tier === 'PLATINUM' ? '#e0aaff' : pt.tier === 'GOLD' ? '#ffd700' : pt.tier === 'SILVER' ? '#c0c0c0' : '#ff6b6b';
                    const isOverconfident = pt.yolo > 0.8 && pt.sam < 0.6;
                    return (
                      <div key={i} className="absolute rounded-full" style={{
                        left: `${x}%`, top: `${y}%`,
                        width: isOverconfident ? '8px' : '5px',
                        height: isOverconfident ? '8px' : '5px',
                        backgroundColor: color,
                        opacity: 0.8,
                        border: isOverconfident ? '2px solid #ff0000' : 'none',
                      }} title={`${pt.class}: YOLO=${pt.yolo.toFixed(2)} SAM=${pt.sam.toFixed(2)} [${pt.tier}]`} />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB: HARD SAMPLES ==================== */}
        {activeTab === 'hard' && (
          <>
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h2 className="text-lg font-heading mb-2">Hall of Shame</h2>
              <p className="text-xs text-zinc-500 mb-4">Top confusing images — prioritize these for manual labeling</p>
              {hardSamples.length > 0 ? (
                <div className="space-y-3">
                  {hardSamples.map((hs, i) => (
                    <div key={i} className="bg-zinc-800 rounded-xl px-5 py-4 border border-red-900/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-red-400 font-mono text-sm">#{i + 1}</span>
                          <span className="text-zinc-200 font-medium truncate max-w-64">{hs.filename}</span>
                          <span className={`text-xs ${MOD_COLORS[hs.modality] || 'text-zinc-500'}`}>{hs.modality}</span>
                        </div>
                        <span className="text-red-400 font-mono text-sm">
                          S={hs.worst_score.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex gap-6 text-xs text-zinc-500">
                        <span>Blur: {hs.quality.blur_score.toFixed(0)}</span>
                        <span>Contrast: {(hs.quality.contrast_score * 100).toFixed(0)}%</span>
                        <span>Occlusion: {(hs.quality.occlusion_density * 100).toFixed(0)}%</span>
                        <span>{hs.reject_count} rejected detections</span>
                      </div>
                      {/* Quality bars */}
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-xs text-zinc-600">Blur</span>
                          <MiniBar value={Math.min(hs.quality.blur_score, 200)} max={200}
                            color={hs.quality.blur_score < 80 ? 'bg-red-500' : 'bg-emerald-500'} />
                        </div>
                        <div>
                          <span className="text-xs text-zinc-600">Contrast</span>
                          <MiniBar value={hs.quality.contrast_score * 100} max={100}
                            color={hs.quality.contrast_score < 0.5 ? 'bg-red-500' : 'bg-emerald-500'} />
                        </div>
                        <div>
                          <span className="text-xs text-zinc-600">Occlusion</span>
                          <MiniBar value={hs.quality.occlusion_density * 100} max={100}
                            color={hs.quality.occlusion_density > 0.3 ? 'bg-red-500' : 'bg-emerald-500'} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500">No hard samples yet. Run a factory iteration first.</p>
              )}
            </div>
          </>
        )}

        {/* ==================== TAB: MODALITY GAPS ==================== */}
        {activeTab === 'modality' && (
          <>
            {/* Modality performance comparison */}
            {Object.keys(modalityGaps).length > 0 ? (
              <>
                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h2 className="text-lg font-heading mb-2">Modality IoU Gap Analysis</h2>
                  <p className="text-xs text-zinc-500 mb-4">
                    How far YOLO is from SAM2 gold-standard per image type. Lower = better.
                  </p>
                  <div className="space-y-4">
                    {Object.entries(modalityGaps).map(([mod, gaps]) => {
                      const latest = gaps[gaps.length - 1];
                      const improving = gaps.length > 1 && gaps[gaps.length - 1].iou_gap_pct < gaps[0].iou_gap_pct;
                      return (
                        <div key={mod} className="bg-zinc-800 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className={`font-medium ${MOD_COLORS[mod] || 'text-zinc-300'}`}>
                                {mod.replace(/_/g, ' ')}
                              </span>
                              <span className="text-zinc-500 text-xs">{latest?.images ?? 0} images</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-lg font-mono ${latest && latest.iou_gap_pct < 10 ? 'text-emerald-400' : latest && latest.iou_gap_pct < 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {latest?.iou_gap_pct.toFixed(1) ?? '?'}% gap
                              </span>
                              {gaps.length > 1 && (
                                <span className={`text-xs ${improving ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {improving ? '↓ improving' : '↑ needs work'}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Mini trend */}
                          {gaps.length > 1 && (
                            <div className="flex items-end gap-1 h-8 mt-2">
                              {gaps.map((g, gi) => (
                                <div key={gi} className="flex-1 flex flex-col items-center">
                                  <div className={`w-full rounded-t ${MOD_BAR_COLORS[mod] || 'bg-zinc-500'}`}
                                    style={{ height: `${Math.max(2, (g.iou_gap_pct / 50) * 32)}px` }} />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-zinc-600">
                            Drift: {latest?.mean_drift.toFixed(1) ?? '?'}px
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actionable insight */}
                {Object.keys(modalityGaps).length > 1 && (
                  <div className="bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-2xl p-6">
                    <h3 className="text-sm font-heading text-[#2563EB] mb-2">RECOMMENDED ACTION</h3>
                    {(() => {
                      const worst = Object.entries(modalityGaps).reduce((a, b) => {
                        const aGap = a[1][a[1].length - 1]?.iou_gap_pct ?? 0;
                        const bGap = b[1][b[1].length - 1]?.iou_gap_pct ?? 0;
                        return bGap > aGap ? b : a;
                      });
                      const best = Object.entries(modalityGaps).reduce((a, b) => {
                        const aGap = a[1][a[1].length - 1]?.iou_gap_pct ?? 100;
                        const bGap = b[1][b[1].length - 1]?.iou_gap_pct ?? 100;
                        return bGap < aGap ? b : a;
                      });
                      const worstGap = worst[1][worst[1].length - 1]?.iou_gap_pct ?? 0;
                      const bestGap = best[1][best[1].length - 1]?.iou_gap_pct ?? 0;
                      return (
                        <p className="text-zinc-300 text-sm">
                          YOLO is currently <span className="text-red-400 font-mono">{worstGap.toFixed(1)}%</span> off
                          the SAM2 gold-standard on <span className="font-medium">{worst[0].replace(/_/g, ' ')}</span>,
                          but only <span className="text-emerald-400 font-mono">{bestGap.toFixed(1)}%</span> off
                          on <span className="font-medium">{best[0].replace(/_/g, ' ')}</span>.
                          Focus the next auto-iteration on <span className="text-[#2563EB] font-medium">{worst[0].replace(/_/g, ' ')} contrast and labeling</span>.
                        </p>
                      );
                    })()}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-zinc-900 rounded-2xl p-12 border border-zinc-800 text-center">
                <p className="text-zinc-400">No modality data yet. Run a factory iteration to generate drift analytics.</p>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!isRunning && passes.length === 0 && !ccData?.latest && (
          <div className="bg-zinc-900 rounded-2xl p-12 border border-zinc-800 text-center">
            <p className="text-zinc-400 text-lg">Command Center — No Data Yet</p>
            <p className="text-zinc-600 text-sm mt-2">Start the scoring loop or run a factory iteration to populate analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}
