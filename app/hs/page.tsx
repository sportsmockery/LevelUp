'use client';

import { useState, useRef, useCallback } from 'react';

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: number[];
  mask_score?: number;
}

interface ContactResult {
  pair_index: number;
  pair_type: string;
  left_tooth_box: number[];
  right_tooth_box: number[];
  contact_box: number[];
  classifier_label: string;
  classifier_confidence: number;
  morphology?: {
    label: string;
    confidence: number;
    gap_width_px?: number;
  };
  clinical?: {
    label: string;
    confidence: number;
    reasoning?: string;
  };
  geometry?: {
    contact_distance_px: number;
    contact_midpoint: number[];
    rotation_angle_deg: number;
    crown_context_left: number;
    crown_context_right: number;
  };
  detector_confidences: {
    left_tooth: number;
    right_tooth: number;
    contact_gap_candidate?: number | null;
  };
  has_restoration?: boolean;
  left_to_right_index?: number[];
}

interface SAMMaskResult {
  class_id: number;
  class_name: string;
  yolo_confidence: number;
  sam_score: number;
  geometric_iou: number;
  final_score: number;
  tier: string;
}

interface SAMContactPair {
  pair_index: number;
  contact_distance_px: number;
  contact_midpoint: number[];
  distal_score: number;
  mesial_score: number;
}

interface AnalysisResult {
  // Detection / Segment fields
  detections?: Detection[];
  count: number;
  image_width?: number;
  image_height?: number;
  annotated_image: string;
  segmented_image?: string;
  // Broken contacts fields
  contacts?: ContactResult[];
  open_contacts?: number;
  metadata?: {
    modality?: string;
    arch_view?: string;
    mm_per_pixel?: number | null;
  };
  // SAM Factory fields
  quality_score?: number;
  gold_count?: number;
  silver_count?: number;
  reject_count?: number;
  masks?: SAMMaskResult[];
  contact_pairs?: SAMContactPair[];
  // Enhance fields
  enhanced_image?: string;
  original_image?: string;
  metrics?: Record<string, number | boolean>;
}

type Mode = 'detect' | 'segment' | 'broken-contacts' | 'rotation' | 'enhance' | 'sam-factory';

// Clinical label colors (dual-layer system)
const CLINICAL_COLORS: Record<string, string> = {
  normal_contact: 'text-emerald-400',
  food_trap_risk: 'text-red-400',
  restoration_failure: 'text-fuchsia-400',
  monitor: 'text-yellow-400',
  not_assessable: 'text-zinc-500',
};

const CLINICAL_BG: Record<string, string> = {
  normal_contact: 'bg-emerald-900/30 border-emerald-700',
  food_trap_risk: 'bg-red-900/30 border-red-700',
  restoration_failure: 'bg-fuchsia-900/30 border-fuchsia-700',
  monitor: 'bg-yellow-900/30 border-yellow-700',
  not_assessable: 'bg-zinc-800/50 border-zinc-600',
};

// Simple label fallback colors
const LABEL_COLORS: Record<string, string> = {
  normal_contact: 'text-emerald-400',
  open_contact: 'text-red-400',
  unclear_contact: 'text-yellow-400',
};

const LABEL_BG: Record<string, string> = {
  normal_contact: 'bg-emerald-900/30 border-emerald-700',
  open_contact: 'bg-red-900/30 border-red-700',
  unclear_contact: 'bg-yellow-900/30 border-yellow-700',
};

interface RotationData {
  rotated_count: number;
  total_teeth_analyzed: number;
  rotation_threshold_deg: number;
  recommendation: { category: string; severity: string; description: string; hardware: { device: string; subtype?: string; reason: string }[] };
  teeth: { angle_deg: number; is_rotated: boolean; method: string; class_name: string; centroid: number[] }[];
}

function RotationResults({ data }: { data: RotationData }) {
  const rec = data.recommendation;
  const severity = rec.severity;
  const borderColor = severity === 'severe' ? 'border-red-700' : severity === 'moderate' ? 'border-orange-700' : severity === 'mild' ? 'border-yellow-700' : 'border-emerald-700';
  const bgColor = severity === 'severe' ? 'bg-red-950/30' : severity === 'moderate' ? 'bg-orange-950/30' : severity === 'mild' ? 'bg-yellow-950/30' : 'bg-emerald-950/20';
  const textColor = severity === 'severe' ? 'text-red-400' : severity === 'moderate' ? 'text-orange-400' : severity === 'mild' ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-5 border ${borderColor} ${bgColor}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-lg font-bold ${textColor}`}>{rec.category}</h3>
          <span className="text-2xl font-mono font-bold text-white">{data.rotated_count} rotated</span>
        </div>
        <p className="text-zinc-300 text-sm">{rec.description}</p>
        {rec.hardware.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {rec.hardware.map((hw, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/50 text-blue-300 border border-blue-800">
                {hw.device}{hw.subtype ? `: ${hw.subtype}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
      {data.teeth.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <h2 className="text-lg font-heading mb-4">Tooth Rotation Details ({data.total_teeth_analyzed} analyzed)</h2>
          <div className="space-y-2">
            {data.teeth.map((t, i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 ${t.is_rotated ? 'bg-red-900/20 border border-red-800' : 'bg-zinc-800'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${t.is_rotated ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className="text-zinc-300 text-sm">{t.class_name || `Tooth ${i + 1}`}</span>
                  <span className="text-zinc-500 text-xs">({t.method})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-lg ${t.is_rotated ? 'text-red-400' : 'text-emerald-400'}`}>
                    {t.angle_deg}&deg;
                  </span>
                  {t.is_rotated && <span className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-300">ROTATED</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-3">Threshold: &gt;{data.rotation_threshold_deg}&deg; = rotated</p>
        </div>
      )}
    </div>
  );
}

export default function HealthyStartPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0.25);
  const [mode, setMode] = useState<Mode>('detect');
  const [showSegmented, setShowSegmented] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setShowSegmented(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('confidence', confidence.toString());
      formData.append('mode', mode);

      const response = await fetch('/api/hs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        let message = 'Analysis failed';
        try {
          const err = JSON.parse(text);
          message = err.details || err.error || message;
        } catch {
          message = text || `Server returned ${response.status}`;
        }
        throw new Error(message);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = () => {
    if (loading) return 'Analyzing...';
    switch (mode) {
      case 'segment': return 'Detect & Segment';
      case 'broken-contacts': return 'Analyze Contacts';
      case 'rotation': return 'Analyze Rotations';
      case 'enhance': return 'Enhance Image';
      case 'sam-factory': return 'Run SAM Factory';
      default: return 'Detect Teeth';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 p-6">
        <h1 className="text-3xl font-heading tracking-tighter">HEALTHY START</h1>
        <p className="text-zinc-400 text-sm mt-1">AI-Powered Dental Detection, Segmentation & Contact Analysis</p>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          {preview ? (
            <img
              src={preview}
              alt="Selected"
              className="max-h-80 mx-auto rounded-xl"
            />
          ) : (
            <div>
              <div className="text-5xl mb-4">🦷</div>
              <p className="text-zinc-300 text-lg font-medium">
                Drop an image here or click to upload
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                Supports JPG, PNG, WEBP
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          {/* Mode Toggle */}
          <div>
            <label className="text-zinc-400 text-sm block mb-2">Analysis Mode</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setMode('detect')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  mode === 'detect'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                YOLO Detection
              </button>
              <button
                onClick={() => setMode('segment')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  mode === 'segment'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                YOLO + SAM Segmentation
              </button>
              <button
                onClick={() => setMode('broken-contacts')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  mode === 'broken-contacts'
                    ? 'bg-[#E91E8C] text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Broken Contacts
              </button>
              <button
                onClick={() => setMode('rotation')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  mode === 'rotation'
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Rotation Analysis
              </button>
              <button
                onClick={() => setMode('enhance')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  mode === 'enhance'
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Enhance (CLAHE)
              </button>
              <button
                onClick={() => setMode('sam-factory')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  mode === 'sam-factory'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                SAM Factory
              </button>
            </div>
          </div>

          {/* Confidence + Analyze */}
          <div className="flex items-end gap-6">
            <div className="flex-1">
              <label className="text-zinc-400 text-sm block mb-2">
                Confidence Threshold: {(confidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || loading}
              className={`text-white px-8 py-3 rounded-2xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                mode === 'broken-contacts'
                  ? 'bg-[#E91E8C] hover:bg-[#c91876]'
                  : 'bg-[#2563EB] hover:bg-[#1d4ed8]'
              }`}
            >
              {buttonLabel()}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Annotated Image */}
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-heading">
                  {mode === 'broken-contacts'
                    ? 'Broken Contacts Analysis'
                    : mode === 'segment'
                    ? 'Detection & Segmentation'
                    : 'Detection Result'}
                </h2>
                {result.segmented_image && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSegmented(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        !showSegmented ? 'bg-[#2563EB] text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Bounding Boxes
                    </button>
                    <button
                      onClick={() => setShowSegmented(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        showSegmented ? 'bg-[#2563EB] text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Segmentation Masks
                    </button>
                  </div>
                )}
              </div>
              <img
                src={showSegmented && result.segmented_image ? result.segmented_image : result.annotated_image}
                alt="Analysis result"
                className="w-full rounded-xl"
              />
            </div>

            {/* Broken Contacts Results */}
            {mode === 'broken-contacts' && result.contacts && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-heading">
                      {result.count} Contact{result.count !== 1 ? 's' : ''} Analyzed
                    </h2>
                    {(result.open_contacts ?? 0) > 0 && (
                      <span className="bg-red-900/50 text-red-300 px-3 py-1 rounded-lg text-sm font-medium">
                        {result.open_contacts} Flagged Contact{result.open_contacts !== 1 ? 's' : ''}
                      </span>
                    )}
                    {result.metadata && (
                      <span className="text-zinc-500 text-xs">
                        {result.metadata.modality?.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Overall Diagnosis Summary */}
                {(() => {
                  const contacts = result.contacts || [];
                  const flagged = contacts.filter(c => {
                    const cl = c.clinical?.label || c.classifier_label;
                    return ['food_trap_risk', 'restoration_failure'].includes(cl);
                  });
                  const hasOpen = flagged.some(c => c.clinical?.label === 'food_trap_risk');
                  const hasResto = flagged.some(c => c.clinical?.label === 'restoration_failure');
                  const severity = hasResto ? 'high' : hasOpen ? 'moderate' : flagged.length > 0 ? 'low' : 'none';

                  return flagged.length > 0 ? (
                    <div className={`rounded-2xl p-5 border ${severity === 'high' ? 'bg-red-950/30 border-red-700' : severity === 'moderate' ? 'bg-yellow-950/30 border-yellow-700' : 'bg-zinc-900 border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-sm font-bold uppercase ${severity === 'high' ? 'text-red-400' : severity === 'moderate' ? 'text-yellow-400' : 'text-zinc-400'}`}>
                          Diagnosis: {severity === 'high' ? 'Intervention Required' : severity === 'moderate' ? 'Treatment Recommended' : 'Monitor'}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${severity === 'high' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                          {flagged.length} site{flagged.length !== 1 ? 's' : ''} flagged
                        </span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Hardware Recommendations</h4>
                        <div className="flex flex-wrap gap-2">
                          {hasOpen && contacts.some(c => c.morphology?.label === 'open_large') && (
                            <>
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/50 text-blue-300 border border-blue-800">Brackets + Coil Spring</span>
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-900/50 text-purple-300 border border-purple-800">Consider TADs (anchorage)</span>
                            </>
                          )}
                          {hasOpen && contacts.some(c => c.morphology?.label === 'open_small') && (
                            <>
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/50 text-blue-300 border border-blue-800">Elastic Chain</span>
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-900/50 text-cyan-300 border border-cyan-800">Aligner + Attachment</span>
                            </>
                          )}
                          {hasOpen && !contacts.some(c => c.morphology?.label === 'open_large' || c.morphology?.label === 'open_small') && (
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/50 text-blue-300 border border-blue-800">Brackets + Archwire</span>
                          )}
                          {hasResto && (
                            <>
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-fuchsia-900/50 text-fuchsia-300 border border-fuchsia-800">Restorative Referral (priority)</span>
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/50 text-blue-300 border border-blue-800">Sectional Wire (post-repair)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : contacts.length > 0 ? (
                    <div className="rounded-2xl p-5 border bg-emerald-950/20 border-emerald-800">
                      <h3 className="text-sm font-bold uppercase text-emerald-400">Diagnosis: Healthy</h3>
                      <p className="text-xs text-emerald-400/70 mt-1">All {contacts.length} contacts are normal. No intervention needed.</p>
                    </div>
                  ) : null;
                })()}

                {/* Per-contact details */}
                {result.contacts.length > 0 ? (
                  <div className="space-y-3">
                    {result.contacts.map((contact, i) => {
                      const clinLabel = contact.clinical?.label || contact.classifier_label;
                      const clinConf = contact.clinical?.confidence || contact.classifier_confidence;
                      const bgClass = CLINICAL_BG[clinLabel] || LABEL_BG[contact.classifier_label] || 'bg-zinc-800 border-zinc-700';
                      const textClass = CLINICAL_COLORS[clinLabel] || LABEL_COLORS[contact.classifier_label] || 'text-zinc-300';
                      const isFlagged = ['food_trap_risk', 'restoration_failure'].includes(clinLabel);
                      const morphLabel = contact.morphology?.label || '';

                      return (
                        <div key={i} className={`rounded-xl px-5 py-4 border ${bgClass}`}>
                          {/* Primary diagnosis */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-500 text-sm font-mono">#{contact.pair_index}</span>
                              <span className={`font-medium ${textClass}`}>
                                {clinLabel.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              {contact.has_restoration && (
                                <span className="text-fuchsia-400 text-xs bg-fuchsia-900/30 px-2 py-0.5 rounded">
                                  RESTORED
                                </span>
                              )}
                            </div>
                            <span className={`font-mono text-lg ${textClass}`}>
                              {(clinConf * 100).toFixed(1)}%
                            </span>
                          </div>

                          {/* Diagnosis text */}
                          {isFlagged && (
                            <div className="mb-2 text-xs">
                              {clinLabel === 'food_trap_risk' && morphLabel === 'open_large' && (
                                <p className="text-red-300">Significant diastema — food impaction risk. Active orthodontic closure recommended.</p>
                              )}
                              {clinLabel === 'food_trap_risk' && morphLabel === 'open_small' && (
                                <p className="text-yellow-300">Minor open contact — potential food trap. Elastic chain or aligner closure recommended.</p>
                              )}
                              {clinLabel === 'food_trap_risk' && !morphLabel.includes('open') && (
                                <p className="text-red-300">Open contact detected — standard orthodontic closure recommended.</p>
                              )}
                              {clinLabel === 'restoration_failure' && (
                                <p className="text-fuchsia-300">Restoration margin defect. Restorative referral needed before orthodontic treatment.</p>
                              )}
                            </div>
                          )}

                          {/* Hardware recommendation for this contact */}
                          {isFlagged && (
                            <div className="mb-2 flex flex-wrap gap-1">
                              {clinLabel === 'food_trap_risk' && morphLabel === 'open_large' && (
                                <>
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Brackets + Coil Spring</span>
                                  <span className="text-xs px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-800">Consider TADs</span>
                                </>
                              )}
                              {clinLabel === 'food_trap_risk' && morphLabel === 'open_small' && (
                                <>
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Elastic Chain</span>
                                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-800">Aligner + Attachment</span>
                                </>
                              )}
                              {clinLabel === 'food_trap_risk' && !morphLabel.includes('open') && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Brackets + Archwire</span>
                              )}
                              {clinLabel === 'restoration_failure' && (
                                <>
                                  <span className="text-xs px-2 py-0.5 rounded bg-fuchsia-900/50 text-fuchsia-300 border border-fuchsia-800">Restorative Referral</span>
                                  {morphLabel.includes('open') && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Sectional Wire (post-repair)</span>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Dual-layer: Morphology + Clinical reasoning */}
                          {contact.morphology && (
                            <div className="mt-2 text-xs space-y-1">
                              <div className="flex gap-4">
                                <span className="text-zinc-500">Morphology:</span>
                                <span className="text-zinc-300">
                                  {contact.morphology.label.replace(/_/g, ' ')}
                                  <span className="text-zinc-500 ml-1">
                                    ({(contact.morphology.confidence * 100).toFixed(0)}%)
                                  </span>
                                </span>
                              </div>
                              {contact.clinical?.reasoning && (
                                <div className="flex gap-4">
                                  <span className="text-zinc-500">Reasoning:</span>
                                  <span className="text-zinc-400 italic">{contact.clinical.reasoning}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Geometric data */}
                          {contact.geometry && (
                            <div className="mt-2 flex gap-6 text-xs text-zinc-500">
                              <span>Gap: {contact.geometry.contact_distance_px.toFixed(1)}px</span>
                              {contact.geometry.rotation_angle_deg !== 0 && (
                                <span>Angle: {contact.geometry.rotation_angle_deg.toFixed(1)}&deg;</span>
                              )}
                              <span>Crown L: {(contact.geometry.crown_context_left * 100).toFixed(0)}%</span>
                              <span>Crown R: {(contact.geometry.crown_context_right * 100).toFixed(0)}%</span>
                            </div>
                          )}

                          {/* Detector confidences */}
                          <div className="mt-2 flex gap-6 text-xs text-zinc-500">
                            <span>Left tooth: {(contact.detector_confidences.left_tooth * 100).toFixed(0)}%</span>
                            <span>Right tooth: {(contact.detector_confidences.right_tooth * 100).toFixed(0)}%</span>
                            {contact.detector_confidences.contact_gap_candidate != null && (
                              <span>Gap det: {(contact.detector_confidences.contact_gap_candidate * 100).toFixed(0)}%</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <p className="text-zinc-500">
                      No adjacent tooth pairs detected. Try lowering the confidence threshold.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Rotation Analysis Results */}
            {mode === 'rotation' && result && (result as unknown as {rotation_analysis?: {rotated_count: number; total_teeth_analyzed: number; rotation_threshold_deg: number; recommendation: {category: string; severity: string; description: string; hardware: {device: string; subtype?: string; reason: string}[]}; teeth: {angle_deg: number; is_rotated: boolean; method: string; class_name: string; centroid: number[]}[]}}).rotation_analysis && (
              <RotationResults data={(result as unknown as {rotation_analysis: {rotated_count: number; total_teeth_analyzed: number; rotation_threshold_deg: number; recommendation: {category: string; severity: string; description: string; hardware: {device: string; subtype?: string; reason: string}[]}; teeth: {angle_deg: number; is_rotated: boolean; method: string; class_name: string; centroid: number[]}[]}}).rotation_analysis} />
            )}

            {/* SAM Factory Results */}
            {mode === 'sam-factory' && result.masks && (
              <div className="space-y-4">
                {/* Tier Summary */}
                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-heading">Auto-Label Results</h2>
                    {result.quality_score !== undefined && (
                      <span className="text-zinc-400 text-sm">
                        Image Quality: {(result.quality_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 text-center">
                      <div className="text-2xl font-heading text-emerald-400">{result.gold_count ?? 0}</div>
                      <div className="text-xs text-emerald-400 mt-1">GOLD (Auto-Approved)</div>
                    </div>
                    <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-center">
                      <div className="text-2xl font-heading text-yellow-400">{result.silver_count ?? 0}</div>
                      <div className="text-xs text-yellow-400 mt-1">SILVER (Review)</div>
                    </div>
                    <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-center">
                      <div className="text-2xl font-heading text-red-400">{result.reject_count ?? 0}</div>
                      <div className="text-xs text-red-400 mt-1">REJECTED</div>
                    </div>
                  </div>
                </div>

                {/* Per-mask details */}
                {result.masks.length > 0 && (
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h2 className="text-lg font-heading mb-4">Mask Details</h2>
                    <div className="space-y-2">
                      {result.masks.map((m, i) => {
                        const tierColor = m.tier === 'GOLD' ? 'text-emerald-400' : m.tier === 'SILVER' ? 'text-yellow-400' : 'text-red-400';
                        const tierBg = m.tier === 'GOLD' ? 'border-emerald-800' : m.tier === 'SILVER' ? 'border-yellow-800' : 'border-red-800';
                        return (
                          <div key={i} className={`flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 border ${tierBg}`}>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-mono px-2 py-0.5 rounded ${tierColor}`}>{m.tier}</span>
                              <span className="font-medium">{m.class_name}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono">
                              <span className="text-zinc-500">YOLO:{(m.yolo_confidence * 100).toFixed(0)}%</span>
                              <span className="text-zinc-500">SAM:{(m.sam_score * 100).toFixed(0)}%</span>
                              <span className="text-zinc-500">IoU:{(m.geometric_iou * 100).toFixed(0)}%</span>
                              <span className={tierColor}>S={(m.final_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Contact Pairs */}
                {result.contact_pairs && result.contact_pairs.length > 0 && (
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h2 className="text-lg font-heading mb-4">Contact Pairs (Geometry)</h2>
                    <div className="space-y-2">
                      {result.contact_pairs.map((pair, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3">
                          <span className="text-zinc-300">Pair #{pair.pair_index}</span>
                          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                            <span>Gap: {pair.contact_distance_px.toFixed(1)}px</span>
                            <span>Center: ({pair.contact_midpoint[0].toFixed(0)}, {pair.contact_midpoint[1].toFixed(0)})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enhance Results */}
            {mode === 'enhance' && result.enhanced_image && (
              <div className="space-y-4">
                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-heading">Enhancement Results</h2>
                    <span className="text-amber-400 text-sm font-mono">
                      Quality: {((result.quality_score ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-500 text-xs mb-2">Original</p>
                      <img src={result.original_image} alt="Original" className="rounded-xl w-full" />
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-2">Enhanced (CLAHE + Sharpening)</p>
                      <img src={result.enhanced_image} alt="Enhanced" className="rounded-xl w-full" />
                    </div>
                  </div>
                  {result.metrics && (
                    <div className="mt-4 flex gap-6 text-xs text-zinc-500">
                      <span>
                        Variance: {typeof result.metrics.original_variance === 'number' ? result.metrics.original_variance.toFixed(1) : '?'}
                        {' \u2192 '}
                        {typeof result.metrics.enhanced_variance === 'number' ? result.metrics.enhanced_variance.toFixed(1) : '?'}
                      </span>
                      {result.metrics.blur_detected && <span className="text-yellow-400">Blur Detected</span>}
                      {result.metrics.sharpening_applied && <span className="text-amber-400">Sharpening Applied</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detection/Segment Results (standard modes) */}
            {(mode === 'detect' || mode === 'segment') && result.detections && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-heading mb-4">
                  {result.count} Detection{result.count !== 1 ? 's' : ''} Found
                </h2>
                {result.detections.length > 0 ? (
                  <div className="space-y-3">
                    {result.detections.map((det, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3"
                      >
                        <div>
                          <span className="font-medium">{det.class_name}</span>
                          <span className="text-zinc-500 text-sm ml-2">
                            ID: {det.class_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {det.mask_score !== undefined && (
                            <span className="text-emerald-400 font-mono text-sm">
                              Mask: {(det.mask_score * 100).toFixed(1)}%
                            </span>
                          )}
                          <span className="text-[#2563EB] font-mono">
                            {(det.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500">
                    No detections above the confidence threshold. Try lowering the threshold.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
