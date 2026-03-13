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
}

interface ImageScoreData {
  filename: string;
  timestamp: string;
  pass_index: number;
  contact_count: number;
  flagged_count: number;
  labels: string[];
  clinical_details: { clinical_label: string; clinical_confidence: number; reasoning?: string }[];
  augment_results?: { transforms: { transform: string }[]; contact_count: number; labels: string[]; consistent: boolean }[];
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

// --- Colors ---

const LABEL_COLORS: Record<string, string> = {
  normal_contact: 'bg-emerald-700 text-emerald-100',
  open_contact: 'bg-red-700 text-red-100',
  unclear_contact: 'bg-yellow-700 text-yellow-100',
  food_trap_risk: 'bg-red-700 text-red-100',
  restoration_failure: 'bg-fuchsia-700 text-fuchsia-100',
  monitor: 'bg-yellow-700 text-yellow-100',
  not_assessable: 'bg-zinc-600 text-zinc-200',
  tooth_crown: 'bg-blue-700 text-blue-100',
};

const BAR_COLORS: Record<string, string> = {
  normal_contact: 'bg-emerald-500',
  open_contact: 'bg-red-500',
  unclear_contact: 'bg-yellow-500',
  food_trap_risk: 'bg-red-500',
  restoration_failure: 'bg-fuchsia-500',
  monitor: 'bg-yellow-500',
};

function LabelPill({ label }: { label: string }) {
  const color = LABEL_COLORS[label] || 'bg-zinc-600 text-zinc-200';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

// --- Page ---

export default function LoopPage() {
  const [status, setStatus] = useState<LoopStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [expandedPass, setExpandedPass] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Config form state
  const [sourceDir, setSourceDir] = useState('data/raw/train/images');
  const [interval, setInterval_] = useState(60);
  const [augEnabled, setAugEnabled] = useState(false);
  const [numVariants, setNumVariants] = useState(3);
  const [modality, setModality] = useState('intraoral_photo');
  const [detConf, setDetConf] = useState(0.3);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/hs/loop');
      if (res.ok) {
        const data: LoopStatus = await res.json();
        setStatus(data);
        setError(null);
      }
    } catch {
      setError('Cannot reach loop service');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  // Adaptive polling: 2s when running, 10s when idle
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const ms = status?.running ? 2000 : 10000;
    pollRef.current = setInterval(fetchStatus, ms);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status?.running, fetchStatus]);

  const handleStart = async () => {
    const config: LoopConfig = {
      source_dir: sourceDir,
      interval_seconds: interval,
      enable_augmentation: augEnabled,
      num_variants: numVariants,
      modality,
      detector_confidence: detConf,
    };
    await fetch('/api/hs/loop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', config }),
    });
    fetchStatus();
  };

  const handleStop = async () => {
    await fetch('/api/hs/loop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    fetchStatus();
  };

  const handleRerun = async (passConfig: LoopConfig) => {
    setSourceDir(passConfig.source_dir);
    setInterval_(passConfig.interval_seconds);
    setAugEnabled(passConfig.enable_augmentation);
    setNumVariants(passConfig.num_variants);
    setModality(passConfig.modality);
    setDetConf(passConfig.detector_confidence);
    await fetch('/api/hs/loop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', config: passConfig }),
    });
    fetchStatus();
  };

  const isRunning = status?.running ?? false;
  const passes = status?.passes ?? [];
  const latestPass = passes.length > 0 ? passes[passes.length - 1] : null;
  const allScores = latestPass?.image_scores ?? [];

  // Aggregate stats from latest pass
  const totalImages = latestPass?.image_count ?? 0;
  const totalContacts = latestPass?.total_contacts ?? 0;
  const totalFlagged = latestPass?.flagged_count ?? 0;
  const flagRate = totalContacts > 0 ? ((totalFlagged / totalContacts) * 100) : 0;
  const consistencyMismatches = latestPass?.consistency_mismatches ?? 0;
  const consistencyTotal = allScores.filter(s => s.consistency_ok !== null).length;
  const consistencyRate = consistencyTotal > 0
    ? (((consistencyTotal - consistencyMismatches) / consistencyTotal) * 100) : 100;
  const labelDist = latestPass?.label_distribution ?? {};
  const maxLabelCount = Math.max(1, ...Object.values(labelDist));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Section 1: Header + Controls */}
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading tracking-tighter">SCORING LOOP</h1>
            {isRunning && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              Config
            </button>
            {isRunning ? (
              <button
                onClick={handleStop}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Start
              </button>
            )}
          </div>
        </div>

        {/* Config Panel */}
        {configOpen && (
          <div className="max-w-5xl mx-auto mt-4 bg-zinc-900 rounded-2xl p-6 border border-zinc-800 grid grid-cols-3 gap-4">
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Source Directory</label>
              <input value={sourceDir} onChange={e => setSourceDir(e.target.value)}
                className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm text-white border border-zinc-700" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Interval (seconds)</label>
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
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Detector Confidence</label>
              <input type="number" step="0.05" min="0.1" max="0.9" value={detConf}
                onChange={e => setDetConf(Number(e.target.value))}
                className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm text-white border border-zinc-700" />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={augEnabled} onChange={e => setAugEnabled(e.target.checked)}
                  className="accent-[#2563EB]" />
                Augmentation
              </label>
            </div>
            {augEnabled && (
              <div>
                <label className="text-zinc-400 text-xs block mb-1">Variants per image</label>
                <input type="number" min="1" max="10" value={numVariants}
                  onChange={e => setNumVariants(Number(e.target.value))}
                  className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm text-white border border-zinc-700" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{error}</div>
        )}
        {status?.errors && status.errors.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-yellow-300 text-sm">
            {status.errors.slice(-3).map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        {/* Section 2: Live Progress */}
        {isRunning && status && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-heading">Pass #{status.current_pass}</h2>
              <span className="text-zinc-400 text-sm">
                {status.current_image_index} / {status.total_images}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
              <div
                className="bg-[#2563EB] h-2 rounded-full transition-all"
                style={{ width: `${status.total_images > 0 ? (status.current_image_index / status.total_images) * 100 : 0}%` }}
              />
            </div>
            <p className="text-zinc-500 text-xs">{status.current_image}</p>
          </div>
        )}

        {/* Section 4: Aggregate Stats */}
        {latestPass && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
                <div className="text-2xl font-heading">{totalImages}</div>
                <div className="text-xs text-zinc-500 mt-1">Images</div>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
                <div className="text-2xl font-heading">{totalContacts}</div>
                <div className="text-xs text-zinc-500 mt-1">Contacts</div>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
                <div className="text-2xl font-heading text-red-400">{totalFlagged}</div>
                <div className="text-xs text-zinc-500 mt-1">Flagged</div>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
                <div className="text-2xl font-heading">{flagRate.toFixed(1)}%</div>
                <div className="text-xs text-zinc-500 mt-1">Flag Rate</div>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
                <div className={`text-2xl font-heading ${consistencyRate === 100 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {consistencyRate.toFixed(0)}%
                </div>
                <div className="text-xs text-zinc-500 mt-1">Consistency</div>
              </div>
            </div>

            {/* Label Distribution */}
            {Object.keys(labelDist).length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4">Label Distribution</h2>
                <div className="space-y-2">
                  {Object.entries(labelDist).sort(([,a],[,b]) => b - a).map(([label, count]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 w-32 text-right truncate">{label.replace(/_/g, ' ')}</span>
                      <div className="flex-1 bg-zinc-800 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-4 rounded-full ${BAR_COLORS[label] || 'bg-zinc-500'}`}
                          style={{ width: `${(count / maxLabelCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Results Feed */}
        {allScores.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-lg font-heading mb-4">Results Feed</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[...allScores].reverse().map((score, i) => (
                <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-300 text-sm font-medium truncate max-w-48">{score.filename}</span>
                    {score.augment_results && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-800 text-purple-200">AUG</span>
                    )}
                    {score.consistency_ok === true && (
                      <span className="text-emerald-400 text-xs">&#10003;</span>
                    )}
                    {score.consistency_ok === false && (
                      <span className="text-yellow-400 text-xs">&#9888;</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-xs">{score.contact_count} contacts</span>
                    {score.flagged_count > 0 && (
                      <span className="text-red-400 text-xs font-mono">{score.flagged_count} flagged</span>
                    )}
                    <div className="flex gap-1">
                      {score.labels.slice(0, 4).map((lbl, j) => (
                        <LabelPill key={j} label={lbl} />
                      ))}
                      {score.labels.length > 4 && (
                        <span className="text-zinc-500 text-xs">+{score.labels.length - 4}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Pass History */}
        {passes.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-lg font-heading mb-4">Pass History</h2>
            <div className="space-y-2">
              {[...passes].reverse().map((pass) => (
                <div key={pass.pass_index}>
                  <div
                    className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 cursor-pointer hover:bg-zinc-750"
                    onClick={() => setExpandedPass(expandedPass === pass.pass_index ? null : pass.pass_index)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-300 font-medium">Pass #{pass.pass_index}</span>
                      <span className="text-zinc-500 text-xs">
                        {new Date(pass.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-500 text-xs">{pass.image_count} images</span>
                      {pass.flagged_count > 0 && (
                        <span className="text-red-400 text-xs">{pass.flagged_count} flagged</span>
                      )}
                      {pass.consistency_mismatches > 0 && (
                        <span className="text-yellow-400 text-xs">{pass.consistency_mismatches} mismatches</span>
                      )}
                      <span className="text-zinc-500 text-xs">{pass.duration_seconds}s</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRerun(pass.config); }}
                        className="text-xs px-3 py-1 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                      >
                        Re-run
                      </button>
                    </div>
                  </div>
                  {expandedPass === pass.pass_index && (
                    <div className="mt-2 ml-4 p-4 bg-zinc-850 rounded-xl border border-zinc-700 text-xs text-zinc-400 space-y-1">
                      <div>Source: {pass.config.source_dir}</div>
                      <div>Modality: {pass.config.modality}</div>
                      <div>Augmentation: {pass.config.enable_augmentation ? `${pass.config.num_variants} variants` : 'off'}</div>
                      <div>Confidence: {pass.config.detector_confidence}</div>
                      <div className="mt-2">Labels: {JSON.stringify(pass.label_distribution)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isRunning && passes.length === 0 && (
          <div className="bg-zinc-900 rounded-2xl p-12 border border-zinc-800 text-center">
            <p className="text-zinc-400 text-lg">No passes yet</p>
            <p className="text-zinc-600 text-sm mt-2">
              Configure a source directory and click Start to begin scoring
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
