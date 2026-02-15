'use client';

import { useState, useEffect } from 'react';

type ValidationScores = {
  overall: number;
  standing: number;
  top: number;
  bottom: number;
  sub_scores: {
    standing: { stance_motion: number; shot_selection: number; shot_finishing: number; sprawl_defense: number; reattacks_chains: number };
    top: { ride_tightness: number; breakdowns: number; turns_nearfalls: number; mat_returns: number };
    bottom: { base_posture: number; standups: number; sitouts_switches: number; reversals: number };
  };
};

type Analysis = {
  id: string;
  overall_score: number;
  standing: number;
  top: number;
  bottom: number;
  analysis_json: any;
  created_at: string;
};

const DEFAULT_SUB_SCORES: ValidationScores['sub_scores'] = {
  standing: { stance_motion: 10, shot_selection: 10, shot_finishing: 10, sprawl_defense: 10, reattacks_chains: 10 },
  top: { ride_tightness: 12, breakdowns: 12, turns_nearfalls: 12, mat_returns: 12 },
  bottom: { base_posture: 12, standups: 12, sitouts_switches: 12, reversals: 12 },
};

export default function CoachValidatePage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [coachName, setCoachName] = useState('');
  const [certification, setCertification] = useState('Level 3');
  const [scores, setScores] = useState<ValidationScores>({
    overall: 70,
    standing: 70,
    top: 70,
    bottom: 70,
    sub_scores: { ...DEFAULT_SUB_SCORES },
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const res = await fetch('/api/admin/analyses?limit=50');
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data.analyses || []);
      }
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  const recalculateOverall = (standing: number, top: number, bottom: number) => {
    return Math.round(standing * 0.4 + top * 0.3 + bottom * 0.3);
  };

  const handlePositionScoreChange = (position: 'standing' | 'top' | 'bottom', value: number) => {
    const newScores = { ...scores, [position]: value };
    newScores.overall = recalculateOverall(newScores.standing, newScores.top, newScores.bottom);
    setScores(newScores);
  };

  const handleSubScoreChange = (position: string, subKey: string, value: number) => {
    const newSubScores = { ...scores.sub_scores };
    (newSubScores as any)[position][subKey] = value;

    // Recalculate position total from sub-scores
    const positionTotal = Object.values((newSubScores as any)[position]).reduce(
      (sum: number, v: any) => sum + (v as number), 0
    ) as number;

    const newScores = {
      ...scores,
      sub_scores: newSubScores,
      [position]: positionTotal,
    };
    newScores.overall = recalculateOverall(newScores.standing, newScores.top, newScores.bottom);
    setScores(newScores);
  };

  const handleSubmit = async () => {
    if (!selectedAnalysis || !coachName) return;

    setSubmitting(true);
    try {
      const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);

      const res = await fetch('/api/admin/analyses/' + selectedAnalysis.id + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_name: coachName,
          coach_certification: certification,
          scores: {
            overall: scores.overall,
            standing: scores.standing,
            top: scores.top,
            bottom: scores.bottom,
            sub_scores: scores.sub_scores,
          },
          notes,
          time_spent_minutes: timeSpentMinutes,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to submit'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-5xl">&#10003;</div>
          <h1 className="text-2xl font-bold">Validation Submitted</h1>
          <p className="text-zinc-400">Thank you for scoring this match. Your expertise helps LevelUp improve.</p>
          <button
            onClick={() => { setSubmitted(false); setSelectedAnalysis(null); setNotes(''); }}
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Score Another Match
          </button>
        </div>
      </div>
    );
  }

  const ScoreSlider = ({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-32 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 accent-blue-600"
      />
      <span className="text-sm font-bold w-8 text-right">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Coach Validation Portal</h1>
        <p className="text-zinc-400 mb-8">
          Score matches independently using the LevelUp rubric. Your scores are compared to AI scores to measure and improve accuracy.
        </p>

        {/* Coach Info */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <label className="text-xs text-zinc-500 font-semibold block mb-1">YOUR NAME</label>
            <input
              type="text"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="Coach Name"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-semibold block mb-1">CERTIFICATION</label>
            <select
              value={certification}
              onChange={(e) => setCertification(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
            >
              <option value="Level 1">USA Wrestling Level 1</option>
              <option value="Level 2">USA Wrestling Level 2</option>
              <option value="Level 3">USA Wrestling Level 3</option>
              <option value="Level 4">USA Wrestling Level 4</option>
              <option value="Level 5">USA Wrestling Level 5</option>
            </select>
          </div>
        </div>

        {/* Analysis Selection */}
        {!selectedAnalysis && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select a Match to Score</h2>
            {loading ? (
              <p className="text-zinc-500">Loading analyses...</p>
            ) : analyses.length === 0 ? (
              <p className="text-zinc-500">No analyses available for validation.</p>
            ) : (
              <div className="space-y-2">
                {analyses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAnalysis(a)}
                    className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-blue-600 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">Analysis {a.id.slice(0, 8)}</span>
                        <span className="text-zinc-500 ml-3 text-sm">{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className="text-sm text-zinc-400">AI Score: {a.overall_score}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scoring Form */}
        {selectedAnalysis && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Score This Match</h2>
              <button onClick={() => setSelectedAnalysis(null)} className="text-sm text-blue-500">
                Change Match
              </button>
            </div>

            {/* Overall Score Display */}
            <div className="text-center">
              <div className="text-6xl font-black">{scores.overall}</div>
              <div className="text-xs text-zinc-500 font-bold tracking-widest mt-1">YOUR OVERALL SCORE</div>
              <div className="text-xs text-zinc-600 mt-1">
                Calculated: Standing ({scores.standing}) x 0.4 + Top ({scores.top}) x 0.3 + Bottom ({scores.bottom}) x 0.3
              </div>
            </div>

            {/* Standing Sub-Scores */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm tracking-wider text-green-500">STANDING (40%)</h3>
                <span className="text-xl font-bold">{scores.standing}</span>
              </div>
              <div className="space-y-2">
                <ScoreSlider label="Stance & Motion" value={scores.sub_scores.standing.stance_motion} max={20} onChange={(v) => handleSubScoreChange('standing', 'stance_motion', v)} />
                <ScoreSlider label="Shot Selection" value={scores.sub_scores.standing.shot_selection} max={20} onChange={(v) => handleSubScoreChange('standing', 'shot_selection', v)} />
                <ScoreSlider label="Shot Finishing" value={scores.sub_scores.standing.shot_finishing} max={20} onChange={(v) => handleSubScoreChange('standing', 'shot_finishing', v)} />
                <ScoreSlider label="Sprawl & Defense" value={scores.sub_scores.standing.sprawl_defense} max={20} onChange={(v) => handleSubScoreChange('standing', 'sprawl_defense', v)} />
                <ScoreSlider label="Re-attacks & Chains" value={scores.sub_scores.standing.reattacks_chains} max={20} onChange={(v) => handleSubScoreChange('standing', 'reattacks_chains', v)} />
              </div>
            </div>

            {/* Top Sub-Scores */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm tracking-wider text-blue-500">TOP (30%)</h3>
                <span className="text-xl font-bold">{scores.top}</span>
              </div>
              <div className="space-y-2">
                <ScoreSlider label="Ride Tightness" value={scores.sub_scores.top.ride_tightness} max={25} onChange={(v) => handleSubScoreChange('top', 'ride_tightness', v)} />
                <ScoreSlider label="Breakdowns" value={scores.sub_scores.top.breakdowns} max={25} onChange={(v) => handleSubScoreChange('top', 'breakdowns', v)} />
                <ScoreSlider label="Turns & Near Falls" value={scores.sub_scores.top.turns_nearfalls} max={25} onChange={(v) => handleSubScoreChange('top', 'turns_nearfalls', v)} />
                <ScoreSlider label="Mat Returns" value={scores.sub_scores.top.mat_returns} max={25} onChange={(v) => handleSubScoreChange('top', 'mat_returns', v)} />
              </div>
            </div>

            {/* Bottom Sub-Scores */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm tracking-wider text-pink-500">BOTTOM (30%)</h3>
                <span className="text-xl font-bold">{scores.bottom}</span>
              </div>
              <div className="space-y-2">
                <ScoreSlider label="Base & Posture" value={scores.sub_scores.bottom.base_posture} max={25} onChange={(v) => handleSubScoreChange('bottom', 'base_posture', v)} />
                <ScoreSlider label="Stand-ups" value={scores.sub_scores.bottom.standups} max={25} onChange={(v) => handleSubScoreChange('bottom', 'standups', v)} />
                <ScoreSlider label="Sit-outs & Switches" value={scores.sub_scores.bottom.sitouts_switches} max={25} onChange={(v) => handleSubScoreChange('bottom', 'sitouts_switches', v)} />
                <ScoreSlider label="Reversals" value={scores.sub_scores.bottom.reversals} max={25} onChange={(v) => handleSubScoreChange('bottom', 'reversals', v)} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-zinc-500 font-semibold block mb-2">NOTES (Why did you score this way? What did AI miss?)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white resize-none"
                placeholder="Provide your reasoning for the scores you gave..."
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !coachName}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Validation Scores'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
