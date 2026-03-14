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
  const [activeTab, setActiveTab] = useState<'loop' | 'omms' | 'results' | 'drift' | 'hard' | 'modality' | 'definitions' | 'guide'>('loop');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [auditData, setAuditData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trainStatus, setTrainStatus] = useState<any>(null);
  const [expandedPass, setExpandedPass] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
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
      const [statusRes, ccRes, auditRes, trainRes] = await Promise.all([
        fetch('/api/hs/loop'),
        fetch('/api/hs/loop?view=command-center'),
        fetch('/api/hs/audit'),
        fetch('/api/hs/train'),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (ccRes.ok) setCcData(await ccRes.json());
      if (auditRes.ok) setAuditData(await auditRes.json());
      if (trainRes.ok) setTrainStatus(await trainRes.json());
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
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hs/loop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', config: {
          source_dir: sourceDir, interval_seconds: interval,
          enable_augmentation: augEnabled, num_variants: numVariants,
          modality, detector_confidence: detConf, auto_fetch_datasets: true,
        }}),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Start failed (${res.status})`);
      } else {
        await fetchAll();
      }
    } catch (e) {
      setError(`Cannot reach Python service — is it running on port 8100? (${e instanceof Error ? e.message : 'unknown error'})`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hs/loop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Stop failed (${res.status})`);
      } else {
        await fetchAll();
      }
    } catch (e) {
      setError(`Cannot reach Python service (${e instanceof Error ? e.message : 'unknown error'})`);
    } finally {
      setActionLoading(false);
    }
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
              <button onClick={handleStop} disabled={actionLoading}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? 'Stopping...' : 'Stop'}
              </button>
            ) : (
              <button onClick={handleStart} disabled={actionLoading}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? 'Starting...' : 'Start'}
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
          {(['loop', 'omms', 'results', 'drift', 'hard', 'modality', 'definitions', 'guide'] as const).map(tab => {
            const labels: Record<string, string> = {
              loop: 'Scoring Loop', omms: 'OMMS / Production', results: 'Results BI',
              drift: 'Drift Analytics', hard: 'Hard Samples', modality: 'Modality Gaps',
              definitions: 'Definitions', guide: 'User Guide',
            };
            const activeBg = tab === 'omms' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white'
              : tab === 'results' ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
              : 'bg-[#2563EB] text-white';
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab ? activeBg : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}>
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{error}</div>
        )}

        {/* Training Progress */}
        {trainStatus && (trainStatus.running || trainStatus.phase === 'done' || trainStatus.phase === 'error') && (
          <div className={`rounded-2xl p-6 border ${
            trainStatus.phase === 'error' ? 'bg-red-950/30 border-red-700' :
            trainStatus.phase === 'done' ? 'bg-green-950/30 border-green-700' :
            'bg-blue-950/30 border-blue-700'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-heading">
                {trainStatus.phase === 'done' ? 'Training Complete' :
                 trainStatus.phase === 'error' ? 'Training Error' :
                 'Auto-Training Pipeline'}
              </h2>
              <span className="text-sm text-zinc-400">{trainStatus.progress_pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 mb-2">
              <div className={`h-3 rounded-full transition-all ${
                trainStatus.phase === 'error' ? 'bg-red-500' :
                trainStatus.phase === 'done' ? 'bg-green-500' :
                'bg-blue-500'
              }`} style={{ width: `${trainStatus.progress_pct}%` }} />
            </div>
            <p className="text-zinc-400 text-sm">{trainStatus.message}</p>
            <div className="flex gap-4 mt-2 text-xs text-zinc-500">
              <span>Detector: {trainStatus.detector_exists || trainStatus.detector_ready ? 'Ready' : 'Pending'}</span>
              <span>Classifier: {trainStatus.classifier_exists || trainStatus.classifier_ready ? 'Ready' : 'Pending'}</span>
              <span>Phase: {trainStatus.phase.replace(/_/g, ' ')}</span>
            </div>
            {trainStatus.error && (
              <p className="text-red-400 text-xs mt-2">{trainStatus.error}</p>
            )}
          </div>
        )}

        {/* Service errors from the Python loop */}
        {status && status.errors && status.errors.length > 0 && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 text-sm">
            <h3 className="text-amber-300 font-medium mb-2">Loop Messages</h3>
            <ul className="space-y-1">
              {status.errors.map((err, i) => (
                <li key={i} className="text-amber-200/80 text-xs font-mono">{err}</li>
              ))}
            </ul>
          </div>
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

            {/* Results Feed with Diagnosis & Hardware */}
            {allScores.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4">Diagnosis & Hardware Feed</h2>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {[...allScores].reverse().slice(0, 50).map((score, i) => {
                    const hasFlagged = score.flagged_count > 0;
                    const clinDetails = score.clinical_details || [];
                    const flaggedDetails = clinDetails.filter((d: Record<string, unknown>) =>
                      ['food_trap_risk', 'restoration_failure', 'open_contact'].includes(d.clinical_label as string)
                    );
                    return (
                      <div key={i} className={`rounded-xl border ${hasFlagged ? 'border-red-800 bg-red-950/20' : 'border-zinc-700 bg-zinc-800'} px-4 py-3`}>
                        {/* Image header */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-300 text-sm font-medium truncate max-w-48">{score.filename}</span>
                            {score.augment_results && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-800 text-purple-200">AUG</span>}
                            {score.consistency_ok === true && <span className="text-emerald-400 text-xs">&#10003;</span>}
                            {score.consistency_ok === false && <span className="text-yellow-400 text-xs">&#9888;</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-xs">{score.contact_count} contacts</span>
                            {hasFlagged && <span className="text-red-400 text-xs font-bold">{score.flagged_count} flagged</span>}
                          </div>
                        </div>

                        {/* Labels row */}
                        <div className="flex gap-1 flex-wrap mb-1">
                          {score.labels.slice(0, 6).map((l: string, j: number) => (
                            <span key={j} className={`text-xs px-1.5 py-0.5 rounded-full ${LABEL_PILL[l] || 'bg-zinc-600 text-zinc-200'}`}>
                              {l.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>

                        {/* Diagnosis per flagged contact */}
                        {flaggedDetails.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {flaggedDetails.map((detail: Record<string, unknown>, di: number) => {
                              const cl = detail.clinical_label as string;
                              const morph = (detail.morphology_label as string) || '';
                              const conf = detail.clinical_confidence as number;
                              const isOpen = cl === 'food_trap_risk';
                              const isResto = cl === 'restoration_failure';
                              return (
                                <div key={di} className="bg-zinc-900/60 rounded-lg px-3 py-2 border border-zinc-700">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold uppercase ${isOpen ? 'text-red-400' : isResto ? 'text-fuchsia-400' : 'text-yellow-400'}`}>
                                      {cl.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-zinc-500 text-xs font-mono">{((conf || 0) * 100).toFixed(0)}%</span>
                                  </div>
                                  {morph && <p className="text-zinc-400 text-xs mt-0.5">Morphology: {morph.replace(/_/g, ' ')}</p>}
                                  {typeof detail.reasoning === 'string' && detail.reasoning && <p className="text-zinc-500 text-xs italic mt-0.5">{detail.reasoning}</p>}

                                  {/* Hardware recommendation */}
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {isOpen && morph === 'open_large' && (
                                      <>
                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Brackets + Coil Spring</span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-800">Consider TADs</span>
                                      </>
                                    )}
                                    {isOpen && morph === 'open_small' && (
                                      <>
                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Elastic Chain</span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-800">Aligner + Attachment</span>
                                      </>
                                    )}
                                    {isOpen && !morph && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Brackets + Archwire</span>
                                    )}
                                    {isResto && (
                                      <>
                                        <span className="text-xs px-2 py-0.5 rounded bg-fuchsia-900/50 text-fuchsia-300 border border-fuchsia-800">Restorative Referral</span>
                                        {morph && morph.includes('open') && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Sectional Wire (post-repair)</span>
                                        )}
                                      </>
                                    )}
                                    {cl === 'open_contact' && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Brackets + Archwire</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Healthy status */}
                        {!hasFlagged && score.contact_count > 0 && (
                          <p className="text-emerald-500 text-xs mt-1">All contacts healthy — no intervention needed</p>
                        )}
                        {score.contact_count === 0 && (
                          <p className="text-zinc-500 text-xs mt-1">No contacts detected</p>
                        )}
                      </div>
                    );
                  })}
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

        {/* ==================== TAB: OMMS / PRODUCTION ==================== */}
        {activeTab === 'omms' && (
          <>
            {auditData?.latest ? (() => {
              const lt = auditData.latest;
              const prog = auditData;
              const statusColor = lt.status === 'GREEN' ? 'text-green-400' : lt.status === 'YELLOW' ? 'text-yellow-400' : 'text-red-400';
              const statusBorder = lt.status === 'GREEN' ? 'border-green-500/30' : lt.status === 'YELLOW' ? 'border-yellow-500/30' : 'border-red-500/30';
              const readinessColor = prog.production_readiness === 'GREEN' ? 'text-green-400' : prog.production_readiness === 'YELLOW' ? 'text-yellow-400' : 'text-red-400';

              return (
                <>
                  {/* OMMS Hero Card */}
                  <div className={`bg-slate-900 p-6 rounded-2xl border ${statusBorder}`}>
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <h2 className="text-xl font-bold">Model Version: {lt.run_id}</h2>
                        <p className="text-blue-400 text-sm">
                          Learning Velocity: {prog.omms_velocity >= 0 ? '+' : ''}{prog.omms_velocity}% per run
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-mono font-bold ${statusColor}`}>OMMS: {lt.omms}</div>
                        <div className="text-xs text-slate-500 uppercase">Target: 92.0</div>
                      </div>
                    </div>

                    {/* Production Progress Bar */}
                    <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden border border-slate-700">
                      <div className="bg-gradient-to-r from-blue-600 to-green-500 h-full transition-all"
                        style={{ width: `${Math.min(lt.omms, 100)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-zinc-600">
                      <span>0</span>
                      <span className="text-red-500">RED &lt;85</span>
                      <span className="text-yellow-500">YELLOW 85-91</span>
                      <span className="text-green-500">GREEN 92+</span>
                      <span>100</span>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                      <div className="bg-zinc-800 rounded-xl p-3 text-center">
                        <div className="text-lg font-mono text-blue-400">{lt.mean_drift_mm.toFixed(2)}mm</div>
                        <div className="text-xs text-zinc-500">Mean Drift</div>
                        {lt.drift_delta !== 0 && (
                          <div className={`text-xs ${lt.drift_delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {lt.drift_delta > 0 ? '+' : ''}{lt.drift_delta.toFixed(3)}mm
                          </div>
                        )}
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-3 text-center">
                        <div className="text-lg font-mono text-emerald-400">{lt.logic_match_pct.toFixed(1)}%</div>
                        <div className="text-xs text-zinc-500">Logic Match</div>
                        {lt.logic_delta !== 0 && (
                          <div className={`text-xs ${lt.logic_delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {lt.logic_delta > 0 ? '+' : ''}{lt.logic_delta.toFixed(1)}%
                          </div>
                        )}
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-3 text-center">
                        <div className={`text-lg font-mono ${lt.b_crit === 0 ? 'text-green-400' : 'text-red-400'}`}>{lt.b_crit}</div>
                        <div className="text-xs text-zinc-500">Bio Breaches</div>
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-3 text-center">
                        <div className="text-lg font-mono text-purple-400">{lt.hardware_match_pct.toFixed(0)}%</div>
                        <div className="text-xs text-zinc-500">HW Accuracy</div>
                      </div>
                    </div>
                  </div>

                  {/* Production Readiness */}
                  <div className={`rounded-2xl p-6 border ${
                    prog.production_readiness === 'GREEN' ? 'bg-green-950/30 border-green-700' :
                    prog.production_readiness === 'YELLOW' ? 'bg-yellow-950/30 border-yellow-700' :
                    'bg-red-950/30 border-red-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-sm font-bold uppercase ${readinessColor}`}>
                          Production Readiness: {prog.production_readiness}
                        </h3>
                        <p className="text-zinc-400 text-sm mt-1">{prog.production_label}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-500 text-xs">Green Streak: {prog.green_streak} runs</span>
                        <span className="text-zinc-600 text-xs block">Need 3 consecutive GREEN</span>
                      </div>
                    </div>
                  </div>

                  {/* Layer Performance Table */}
                  {prog.layer_performance && prog.layer_performance.length > 0 && (
                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <h2 className="text-lg font-heading mb-4">Intelligence Audit</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-700">
                              <th className="text-left py-2 text-zinc-500 font-normal">Layer</th>
                              <th className="text-left py-2 text-zinc-500 font-normal">Performance Metric</th>
                              <th className="text-right py-2 text-zinc-500 font-normal">Delta (vs 7D Avg)</th>
                              <th className="text-right py-2 text-zinc-500 font-normal">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prog.layer_performance.map((lp: Record<string, string>, idx: number) => (
                              <tr key={idx} className="border-b border-zinc-800">
                                <td className="py-2 text-zinc-300 font-medium">{lp.layer}</td>
                                <td className="py-2 text-zinc-400">{lp.metric}: <span className="text-white font-mono">{lp.value}</span></td>
                                <td className="py-2 text-right font-mono text-zinc-400">{lp.delta}</td>
                                <td className="py-2 text-right">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    lp.status === 'improving' ? 'bg-green-900/50 text-green-400' :
                                    lp.status === 'secure' ? 'bg-green-900/50 text-green-400' :
                                    lp.status === 'drift' ? 'bg-yellow-900/50 text-yellow-400' :
                                    lp.status === 'breach' ? 'bg-red-900/50 text-red-400' :
                                    'bg-zinc-800 text-zinc-400'
                                  }`}>
                                    {lp.status === 'improving' ? 'Improving' :
                                     lp.status === 'secure' ? 'Secure' :
                                     lp.status === 'drift' ? 'Logic Drift' :
                                     lp.status === 'breach' ? 'BREACH' :
                                     lp.status === 'needs_work' ? 'Needs Work' : 'Stable'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* OMMS Run History */}
                  {prog.omms_history && prog.omms_history.length > 1 && (
                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <h2 className="text-lg font-heading mb-4">OMMS Trend (Last {prog.omms_history.length} Runs)</h2>
                      <div className="flex items-end gap-1 h-32">
                        {prog.omms_history.map((h: Record<string, unknown>, i: number) => {
                          const score = h.omms as number;
                          const barH = Math.max(4, (score / 100) * 120);
                          const color = (h.status as string) === 'GREEN' ? 'bg-green-500' :
                                        (h.status as string) === 'YELLOW' ? 'bg-yellow-500' : 'bg-red-500';
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-xs text-zinc-500">{score.toFixed(0)}</span>
                              <div className={`w-full ${color} rounded-t`} style={{ height: `${barH}px` }} />
                            </div>
                          );
                        })}
                      </div>
                      {/* 92.0 target line indicator */}
                      <div className="text-xs text-zinc-600 mt-2 text-center">
                        Target: 92.0 for 3 consecutive GREEN runs = Production Ready
                      </div>
                    </div>
                  )}

                  {/* Top Failure Mode */}
                  {prog.top_failure_mode && (
                    <div className="bg-red-950/20 border border-red-800 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-red-400 uppercase mb-2">Top Model Failure Mode</h3>
                      <p className="text-zinc-300 text-sm">
                        <span className="font-medium">{prog.top_failure_mode.pattern}</span>
                        {' '}— Accuracy: <span className="text-red-400 font-mono">{prog.top_failure_mode.accuracy}%</span>
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">
                        Action: {prog.top_failure_mode.action}
                      </p>
                    </div>
                  )}
                </>
              );
            })() : (
              <div className="bg-zinc-900 rounded-2xl p-12 border border-zinc-800 text-center">
                <p className="text-zinc-400 text-lg">No OMMS Data Yet</p>
                <p className="text-zinc-600 text-sm mt-2">
                  Run a scoring pass with trained models to generate OMMS scores.
                  The auditor validates every run against clinical hard logic.
                </p>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB: RESULTS BI ==================== */}
        {activeTab === 'results' && (
          <>
            {latestPass ? (() => {
              const ld = latestPass.label_distribution || {};
              const totalC = latestPass.total_contacts || 0;
              const normal = ld['normal_contact'] || 0;
              const open = ld['open_contact'] || 0;
              const unclear = ld['unclear_contact'] || 0;
              const healthPct = totalC > 0 ? ((normal / totalC) * 100).toFixed(1) : '0';
              const flagPct = totalC > 0 ? ((open / totalC) * 100).toFixed(1) : '0';
              const unclearPct = totalC > 0 ? ((unclear / totalC) * 100).toFixed(1) : '0';
              const passHistory = passes.slice(-20);
              const maxContacts = Math.max(1, ...passHistory.map(p => p.total_contacts || 1));

              return (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/20 rounded-2xl p-5 border border-emerald-800">
                      <div className="text-3xl font-mono font-bold text-emerald-400">{healthPct}%</div>
                      <div className="text-xs text-emerald-400/70 mt-1">Healthy Contacts</div>
                      <div className="text-lg text-zinc-400 mt-2">{normal} / {totalC}</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-900/40 to-red-950/20 rounded-2xl p-5 border border-red-800">
                      <div className="text-3xl font-mono font-bold text-red-400">{flagPct}%</div>
                      <div className="text-xs text-red-400/70 mt-1">Flagged (Open)</div>
                      <div className="text-lg text-zinc-400 mt-2">{open} / {totalC}</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/20 rounded-2xl p-5 border border-yellow-800">
                      <div className="text-3xl font-mono font-bold text-yellow-400">{unclearPct}%</div>
                      <div className="text-xs text-yellow-400/70 mt-1">Unclear (Review)</div>
                      <div className="text-lg text-zinc-400 mt-2">{unclear} / {totalC}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/20 rounded-2xl p-5 border border-blue-800">
                      <div className="text-3xl font-mono font-bold text-blue-400">{latestPass.image_count}</div>
                      <div className="text-xs text-blue-400/70 mt-1">Images Scanned</div>
                      <div className="text-lg text-zinc-400 mt-2">{passes.length} passes</div>
                    </div>
                  </div>

                  {/* Contact Classification Donut (horizontal bar representation) */}
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h2 className="text-lg font-heading mb-4">Contact Classification Breakdown</h2>
                    <div className="flex h-8 rounded-full overflow-hidden border border-zinc-700">
                      {normal > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(normal / totalC) * 100}%` }} />}
                      {open > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(open / totalC) * 100}%` }} />}
                      {unclear > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${(unclear / totalC) * 100}%` }} />}
                    </div>
                    <div className="flex justify-between mt-3 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Normal {healthPct}%</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Flagged {flagPct}%</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Unclear {unclearPct}%</span>
                    </div>
                  </div>

                  {/* Pass-over-Pass Trend */}
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h2 className="text-lg font-heading mb-4">Contacts per Pass (Last {passHistory.length})</h2>
                    <div className="flex items-end gap-1 h-40">
                      {passHistory.map((p, i) => {
                        const nc = (p.label_distribution?.['normal_contact'] || 0);
                        const oc = (p.label_distribution?.['open_contact'] || 0);
                        const uc = (p.label_distribution?.['unclear_contact'] || 0);
                        const tot = nc + oc + uc || 1;
                        const barH = Math.max(8, (p.total_contacts / maxContacts) * 140);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs text-zinc-600">{p.total_contacts}</span>
                            <div className="w-full flex flex-col rounded-t overflow-hidden" style={{ height: `${barH}px` }}>
                              <div className="bg-emerald-500" style={{ height: `${(nc / tot) * 100}%` }} />
                              <div className="bg-red-500" style={{ height: `${(oc / tot) * 100}%` }} />
                              <div className="bg-yellow-500" style={{ height: `${(uc / tot) * 100}%` }} />
                            </div>
                            <span className="text-xs text-zinc-600">#{p.pass_index}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Normal</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Flagged</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Unclear</span>
                    </div>
                  </div>

                  {/* Flag Rate Trend */}
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h2 className="text-lg font-heading mb-4">Flag Rate Trend (%)</h2>
                    <div className="flex items-end gap-1 h-32">
                      {passHistory.map((p, i) => {
                        const rate = p.total_contacts > 0 ? (p.flagged_count / p.total_contacts) * 100 : 0;
                        const barH = Math.max(4, rate * 3);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs text-zinc-500">{rate.toFixed(1)}%</span>
                            <div className={`w-full rounded-t ${rate > 10 ? 'bg-red-500' : rate > 5 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                              style={{ height: `${barH}px` }} />
                            <span className="text-xs text-zinc-600">#{p.pass_index}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-zinc-600 mt-2">Lower is better. Above 10% = concern. Above 30% = critical.</p>
                  </div>

                  {/* Duration Trend */}
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h2 className="text-lg font-heading mb-4">Processing Speed (seconds per pass)</h2>
                    <div className="flex items-end gap-1 h-24">
                      {passHistory.map((p, i) => {
                        const maxDur = Math.max(1, ...passHistory.map(pp => pp.duration_seconds || 1));
                        const barH = Math.max(4, ((p.duration_seconds || 0) / maxDur) * 80);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs text-zinc-500">{p.duration_seconds}s</span>
                            <div className="w-full bg-blue-500 rounded-t" style={{ height: `${barH}px` }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-Label Detail Table */}
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h2 className="text-lg font-heading mb-4">Label Detail (Latest Pass)</h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="text-left py-2 text-zinc-500 font-normal">Label</th>
                          <th className="text-right py-2 text-zinc-500 font-normal">Count</th>
                          <th className="text-right py-2 text-zinc-500 font-normal">% of Total</th>
                          <th className="text-left py-2 pl-4 text-zinc-500 font-normal">Distribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(ld).sort(([,a],[,b]) => (b as number) - (a as number)).map(([label, count]) => {
                          const pct = totalC > 0 ? ((count as number) / totalC * 100) : 0;
                          const color = label === 'normal_contact' ? 'bg-emerald-500' : label === 'open_contact' ? 'bg-red-500' : label === 'unclear_contact' ? 'bg-yellow-500' : 'bg-blue-500';
                          return (
                            <tr key={label} className="border-b border-zinc-800">
                              <td className="py-2 text-zinc-300">{label.replace(/_/g, ' ')}</td>
                              <td className="py-2 text-right font-mono text-zinc-400">{count as number}</td>
                              <td className="py-2 text-right font-mono text-zinc-400">{pct.toFixed(1)}%</td>
                              <td className="py-2 pl-4">
                                <div className="w-full bg-zinc-800 rounded-full h-2">
                                  <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Flagged Images */}
                  {allScores.filter(s => s.flagged_count > 0).length > 0 && (
                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <h2 className="text-lg font-heading mb-4">Top Flagged Images</h2>
                      <div className="space-y-2">
                        {allScores.filter(s => s.flagged_count > 0)
                          .sort((a, b) => b.flagged_count - a.flagged_count)
                          .slice(0, 15)
                          .map((s, i) => {
                            const details = (s.clinical_details || []).filter((d: Record<string, unknown>) =>
                              ['food_trap_risk', 'restoration_failure', 'open_contact'].includes(d.clinical_label as string));
                            return (
                              <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 border border-red-900/30">
                                <div className="flex items-center gap-3">
                                  <span className="text-red-400 font-mono text-xs">#{i + 1}</span>
                                  <span className="text-zinc-300 text-sm truncate max-w-48">{s.filename}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-red-400 text-xs font-bold">{s.flagged_count} flagged</span>
                                  <span className="text-zinc-500 text-xs">{s.contact_count} total</span>
                                  {details.slice(0, 2).map((d: Record<string, unknown>, di: number) => (
                                    <span key={di} className="text-xs px-1.5 py-0.5 rounded bg-red-900/50 text-red-300">
                                      {(d.morphology_label as string || d.clinical_label as string || '').replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              );
            })() : (
              <div className="bg-zinc-900 rounded-2xl p-12 border border-zinc-800 text-center">
                <p className="text-zinc-400 text-lg">No Results Yet</p>
                <p className="text-zinc-600 text-sm mt-2">Start the scoring loop to generate BI data.</p>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB: DEFINITIONS ==================== */}
        {activeTab === 'definitions' && (
          <div className="space-y-6">
            {[
              { category: 'Scoring & Metrics', items: [
                { term: 'OMMS', def: 'Orthodontic Model Maturity Score. Composite score (0-100) measuring how ready the AI model is for production. Formula: OMMS = (0.3 x S_geo) + (0.7 x S_clin) - (10 x B_crit). Target: 92+ for 3 consecutive runs.' },
                { term: 'S_geo (Geometric Score)', def: 'Measures detection accuracy: how closely YOLO bounding boxes match SAM2 segmentation masks. Based on d_min drift (target <= 0.15mm) and mask IoU (target >= 0.85). Worth 30% of OMMS.' },
                { term: 'S_clin (Clinical Score)', def: 'Measures diagnostic accuracy: what percentage of the AI diagnoses and hardware suggestions match expert orthodontist assessments. Worth 70% of OMMS.' },
                { term: 'B_crit (Biological Breach)', def: 'Critical safety violation. Occurs when hardware is placed within 1.0mm of a root apex. Each breach deducts 10 points from OMMS and automatically sets status to RED.' },
                { term: 'IoU (Intersection over Union)', def: 'Overlap between predicted detection box and ground truth mask. 1.0 = perfect overlap, 0.0 = no overlap. Above 0.70 is acceptable, above 0.85 is good.' },
                { term: 'Mean Drift', def: 'Average pixel distance between YOLO detection boundaries and SAM2 refined masks. Lower is better. Target: <= 0.15mm. Above 15px indicates detection issues.' },
                { term: 'Flag Rate', def: 'Percentage of contacts flagged as problematic (open, restoration failure). Above 10% warrants investigation, above 30% is critical.' },
                { term: 'Logic Match', def: 'Percentage of AI diagnoses that align with the hard clinical logic rules (sagittal, vertical, transverse classification). Target: >= 95%.' },
                { term: 'Learning Velocity', def: 'Rate of OMMS improvement per run. Positive = model improving. Negative = model regressing. Plateau = needs new data or purge.' },
                { term: 'Confidence', def: 'How certain the model is about a detection or classification. 0-100%. Above 80% = trustworthy. 50-80% = cross-reference. Below 50% = discard.' },
              ]},
              { category: 'Clinical Labels', items: [
                { term: 'Normal Contact', def: 'Tight, healthy interproximal contact between adjacent teeth. No gap, no food trap risk. No intervention needed.' },
                { term: 'Open Contact', def: 'Visible gap between teeth. Food impaction risk. May require brackets, elastic chain, or aligners to close.' },
                { term: 'Food Trap Risk', def: 'Clinical diagnosis: open contact likely to trap food between teeth, causing decay or periodontal issues. Requires closure.' },
                { term: 'Restoration Failure', def: 'Filling or crown margin is defective, causing a step or overhang at the contact point. Needs restorative referral before orthodontic treatment.' },
                { term: 'Monitor', def: 'Borderline finding — not clearly pathological but could progress. Re-image in 3-6 months. No hardware yet.' },
                { term: 'Not Assessable', def: 'Image quality too low to make a diagnosis. Re-photograph the patient with better positioning/lighting.' },
                { term: 'Unclear Contact', def: 'Model confidence too low to classify definitively. Needs manual expert review or better imaging.' },
              ]},
              { category: 'Morphology (What the AI Sees)', items: [
                { term: 'Closed Contact', def: 'Physically tight contact — no visible gap between tooth surfaces. Healthy.' },
                { term: 'Open Small (< 0.5mm)', def: 'Minor gap between teeth. May or may not cause food impaction depending on location and patient anatomy.' },
                { term: 'Open Large (> 1.0mm)', def: 'Significant diastema. Almost always causes food impaction. Requires active orthodontic closure.' },
                { term: 'Restoration Step', def: 'Step or overhang at a filling/crown margin creating an artificial gap or ledge at the contact point.' },
                { term: 'Marginal Ridge Mismatch', def: 'Adjacent teeth have different marginal ridge heights, disrupting the contact point and food deflection.' },
              ]},
              { category: 'Hardware Recommendations', items: [
                { term: 'Brackets + Archwire', def: 'Standard fixed orthodontic appliance. Metal or ceramic brackets bonded to teeth, connected by an archwire that applies force to move teeth. Used for most alignment and space closure cases.' },
                { term: 'Elastic Chain', def: 'Continuous elastic band connecting multiple brackets. Applies gentle closing force between teeth. Used for small gaps (< 0.5mm) and minor space closure.' },
                { term: 'Aligner + Attachment', def: 'Clear plastic aligner (like Invisalign) with composite attachments bonded to teeth. Attachments provide grip for the aligner to apply precise force. Used for closing small to moderate gaps.' },
                { term: 'Brackets + Coil Spring', def: 'Fixed brackets with a NiTi coil spring compressed between them. Applies strong continuous force for closing large gaps (> 1.0mm). More force than elastic chain.' },
                { term: 'TADs (Temporary Anchorage Devices)', def: 'Titanium mini-screws placed in the jawbone to provide absolute anchorage. Used when overjet > 6mm with high anchorage need, or to prevent unwanted tooth movement during space closure. CRITICAL: must be > 1mm from root apex.' },
                { term: 'RPE (Rapid Palatal Expander)', def: 'Appliance cemented to upper molars that widens the palate. Used when crowding > 5mm due to narrow maxilla. Alternative to extractions in growing patients.' },
                { term: 'Power Chain', def: 'Elastic chain connecting 3+ brackets for bulk space closure. Used when d_min > 1.0mm across multiple contacts.' },
                { term: 'Sectional Wire', def: 'Short segment of archwire spanning 2-3 teeth. Used after restoration repair to re-establish contact without full braces.' },
                { term: 'Restorative Referral', def: 'Not hardware — a recommendation to fix a defective filling or crown before starting orthodontic treatment. The restoration must be corrected first or it will interfere with tooth movement.' },
              ]},
              { category: 'Sagittal Classification', items: [
                { term: 'Class I', def: 'Normal molar relationship. Upper first molar fits into the groove of the lower first molar. May still have crowding or spacing.' },
                { term: 'Class II Division 1', def: 'Lower jaw is positioned behind upper jaw. Molar relation = distal, overjet > 4mm. "Buck teeth" appearance. Often needs retraction with TADs.' },
                { term: 'Class II Division 2', def: 'Similar to Div 1 but upper incisors tilt backward (lingual). Molar = distal, overjet < 2mm, incisors = lingual. Often missed by AI — top failure mode.' },
                { term: 'Class III', def: 'Lower jaw protrudes past upper jaw. Molar = mesial, overjet < 0mm (underbite). May require surgical intervention if skeletal.' },
                { term: 'Skeletal Class III', def: 'Class III caused by bone structure (ANB angle < 0), not just tooth position. Flagged as surgical risk — may need orthognathic surgery.' },
              ]},
              { category: 'Vertical & Transverse', items: [
                { term: 'Anterior Open Bite', def: 'Front teeth do not overlap — overbite < 0mm. Gap between upper and lower incisors when biting. Often caused by tongue thrust or thumb sucking.' },
                { term: 'Deep Bite', def: 'Excessive vertical overlap — overbite > 40%. Lower incisors may bite into the palate. Needs intrusion mechanics.' },
                { term: 'Posterior Crossbite', def: 'Upper arch narrower than lower arch. Upper teeth bite inside lower teeth on one or both sides. Needs palatal expansion (RPE).' },
                { term: 'Overjet', def: 'Horizontal distance (mm) between upper and lower front teeth. Normal: 2-4mm. > 4mm = Class II risk. < 0mm = underbite/Class III.' },
                { term: 'Overbite', def: 'Vertical overlap of upper front teeth over lower. Normal: 2-4mm or ~25%. < 0mm = open bite. > 40% = deep bite.' },
              ]},
              { category: 'Detection Classes (YOLO 9-Class)', items: [
                { term: 'Tooth Crown', def: 'The visible part of the tooth above the gum line. Primary anchor for all pair calculations.' },
                { term: 'Mesial Surface', def: 'The side of the tooth facing toward the front (midline) of the mouth. The anterior-facing proximal wall.' },
                { term: 'Distal Surface', def: 'The side of the tooth facing toward the back of the mouth. Used with mesial of the next tooth to compute contact distance.' },
                { term: 'Occlusal Surface', def: 'The biting/chewing surface of the tooth. Where articulating marks appear.' },
                { term: 'Restoration Margin', def: 'The interface between natural tooth and a filling or crown. Defects here cause restoration_step morphology.' },
                { term: 'Contact Gap Candidate', def: 'A visible dark space between teeth detected by YOLO. Primary indicator for open contacts.' },
                { term: 'Articulating Mark', def: 'Ink marks on the biting surface from bite paper. Indicates occlusion has been checked.' },
                { term: 'Ortho Hardware', def: 'Brackets, wires, bands detected in the image. Excluded from contact distance calculations. Indicates active treatment.' },
                { term: 'Gingival Margin', def: 'The gum line around each tooth. Used to assess vertical food impaction depth.' },
              ]},
              { category: 'Tier System (SAM Factory)', items: [
                { term: 'PLATINUM', def: 'Highest quality auto-label. Score > 0.92 and IoU > 0.75. Trusted for training without review.' },
                { term: 'GOLD', def: 'High quality. Score > 0.85 and IoU > 0.70. Auto-approved for training.' },
                { term: 'SILVER', def: 'Moderate quality. Score > 0.65. Needs human review before use in training.' },
                { term: 'REJECT', def: 'Low quality. Score <= 0.65. Excluded from training. May indicate bad image or detection failure.' },
                { term: 'SCRAP', def: 'Demoted by Truth Engine after a Clinical Override. Was Silver/Gold but found to be unreliable. Excluded from training permanently until relabeled.' },
              ]},
              { category: 'Production Readiness', items: [
                { term: 'RED', def: 'OMMS < 85 or any biological breach detected. Model is not safe for clinical use. Needs more training and data cleaning.' },
                { term: 'YELLOW', def: 'OMMS 85-91. Model is close but has specific weak areas. Needs targeted training on failing clusters.' },
                { term: 'GREEN', def: 'OMMS >= 92. Model meets clinical accuracy threshold. 3 consecutive GREEN runs = ready for Level 3 Autopilot (production).' },
                { term: 'Green Streak', def: 'Number of consecutive runs with GREEN status. Need 3 in a row for production clearance.' },
              ]},
              { category: 'Truth Engine', items: [
                { term: 'Clinical Override', def: 'When an orthodontist disagrees with the AI diagnosis and manually corrects it. Triggers the Truth Engine back-propagation pipeline.' },
                { term: 'Recursive Purge', def: 'Mass operation that finds all images similar to an overridden case and demotes them from training data. Prevents the same mistake from repeating.' },
                { term: 'Geometric Signature', def: 'A searchable fingerprint for each image based on d_min range, image angle, hardware types, modality, and quality flags. Used for vector search during purges.' },
                { term: 'Labeling Hint', def: 'Auto-generated note attached to purged images explaining what the AI got wrong and how to label correctly.' },
                { term: 'Biological Breach Alert', def: 'Critical safety flag. Hardware placement within 1.0mm of a root apex. Blocks inference immediately. -10 OMMS penalty.' },
              ]},
              { category: 'Image Modalities', items: [
                { term: 'Intraoral Photo', def: 'Direct photograph taken inside the mouth. Weight: 30%. Most common but affected by saliva glare and angle variation.' },
                { term: 'Bitewing X-ray', def: 'X-ray showing crowns and contact areas of upper and lower teeth. Weight: 40% (highest confidence). Best for confirming contact status.' },
                { term: 'Periapical X-ray', def: 'X-ray showing full tooth including root tip and surrounding bone. Weight: 20%. Good for root proximity checks.' },
                { term: 'CBCT', def: 'Cone Beam Computed Tomography. 3D X-ray scan of the skull. Used for surgical planning, impacted teeth, and TAD placement. Metal artifacts from brackets can degrade quality.' },
              ]},
            ].map((section, si) => (
              <div key={si} className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4 text-blue-400">{section.category}</h2>
                <div className="space-y-3">
                  {section.items.map((item, ii) => (
                    <div key={ii} className="border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                      <dt className="text-sm font-medium text-zinc-200">{item.term}</dt>
                      <dd className="text-xs text-zinc-400 mt-1">{item.def}</dd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================== TAB: USER GUIDE ==================== */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            {[
              { title: 'Quick Start', content: [
                '1. Start the Colab server (Cells 1-5 in the notebook)',
                '2. Go to levelupwrestlingapp.com/hs/loop',
                '3. Click Start — auto-trains if models are missing (~20 min first time)',
                '4. Once trained, the loop scores images and shows diagnoses',
                '5. Check the Results BI tab for graphical analysis',
                '6. Check OMMS / Production tab for model maturity',
              ]},
              { title: 'Colab Server Setup', content: [
                'Cell 1: Mount Google Drive, clone repo, install dependencies',
                'Cell 2: Download SAM model, restore trained models from Drive',
                'Cell 3: Set ROBOFLOW_API_KEY (paste your key)',
                'Cell 4: Start ngrok tunnel (paste your ngrok token)',
                'Cell 5: Start FastAPI server',
                '',
                'IMPORTANT: Restart ngrok (Cell 4) BEFORE restarting server (Cell 5)',
                'If ngrok URL changes, update HS_DETECTION_URL in Vercel env vars',
              ]},
              { title: 'Reading the Scoring Loop Tab', content: [
                'Stats Row: Images scanned, contacts found, flagged count, flag rate, duration',
                'Label Distribution: Bar chart of how contacts are classified',
                'Diagnosis & Hardware Feed: Per-image clinical labels with hardware suggestions',
                '  - Red border = flagged contacts detected',
                '  - Blue pills = hardware recommendations',
                '  - Green text = all contacts healthy',
              ]},
              { title: 'Reading the Results BI Tab', content: [
                'KPI Cards: Healthy %, Flagged %, Unclear %, Images scanned',
                'Classification Bar: Visual ratio of normal/flagged/unclear',
                'Contacts per Pass: Stacked bar chart showing composition over time',
                'Flag Rate Trend: Is the flag rate increasing or decreasing?',
                'Processing Speed: How long each pass takes (monitors for slowdowns)',
                'Top Flagged Images: Ranked list of most problematic images',
              ]},
              { title: 'Understanding OMMS Scores', content: [
                'OMMS = (0.3 x Geometric) + (0.7 x Clinical) - (10 x Bio Breaches)',
                'RED (< 85): Model not safe. Needs more training.',
                'YELLOW (85-91): Close but has weak areas. Targeted training needed.',
                'GREEN (92+): Meets clinical standard. 3 consecutive GREEN = production ready.',
                '',
                'OMMS auto-posts after every loop pass. No manual action needed.',
              ]},
              { title: 'Hardware Recommendation Logic', content: [
                'Open Small (< 0.5mm): Elastic Chain or Aligner + Attachment',
                'Open Large (> 1.0mm): Brackets + Coil Spring, consider TADs',
                'Restoration Failure: Restorative Referral first, then Sectional Wire',
                'Crowding > 5mm: RPE (Rapid Palatal Expander)',
                'Overjet > 6mm + High Anchorage: TADs',
                'd_min > 1.0mm across 3+ contacts: Power Chain',
                '',
                'CRITICAL: TADs within 1mm of root = Biological Breach Alert',
              ]},
              { title: 'Improving the Model', content: [
                '1. Run loop passes — the model learns from each scoring run',
                '2. Use Clinical Overrides when the AI gets it wrong',
                '3. Truth Engine auto-purges similar bad data from training',
                '4. Retrain (POST /api/hs/train) after accumulating overrides',
                '5. Run SAM Factory iterations for real IoU measurements',
                '6. Track OMMS trend — target steady upward climb to 92+',
              ]},
              { title: 'Data Persistence', content: [
                'Trained models: Saved to Google Drive (hs_models/) — survive restarts',
                'Loop results: Saved to Drive (hs_models/results/) after each pass',
                'OMMS history: Saved to Drive (hs_models/results/audit_history.json)',
                'Truth Engine: Saved to Colab disk (data/truth_engine/)',
                '',
                'To manually save models: Run "Save to Drive" utility cell in Colab',
              ]},
              { title: 'Production Readiness Checklist', content: [
                '[ ] OMMS >= 92 for 3 consecutive runs',
                '[ ] Zero biological breaches in last 10 runs',
                '[ ] Logic Match >= 95%',
                '[ ] Hardware Accuracy >= 90%',
                '[ ] Mean Drift <= 0.15mm',
                '[ ] All modality gaps < 10%',
                '[ ] Top failure mode accuracy > 85%',
              ]},
            ].map((section, si) => (
              <div key={si} className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-3">{section.title}</h2>
                <div className="space-y-1">
                  {section.content.map((line, li) => (
                    <p key={li} className={`text-sm ${line === '' ? 'h-2' : line.startsWith('IMPORTANT') || line.startsWith('CRITICAL') ? 'text-red-400 font-medium' : line.startsWith('[ ]') ? 'text-zinc-400 font-mono text-xs' : 'text-zinc-400'}`}>
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isRunning && passes.length === 0 && !ccData?.latest && activeTab === 'loop' && (
          <div className="bg-zinc-900 rounded-2xl p-12 border border-zinc-800 text-center">
            <p className="text-zinc-400 text-lg">Command Center — No Data Yet</p>
            <p className="text-zinc-600 text-sm mt-2">Start the scoring loop or run a factory iteration to populate analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}
