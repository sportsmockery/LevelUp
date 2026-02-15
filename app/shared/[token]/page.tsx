'use client';

import { useState, useEffect, use } from 'react';

type SharedAnalysis = {
  overallScore: number;
  positionScores: { standing: number; top: number; bottom: number };
  strengths: string[];
  weaknesses: string[];
  matchStyle: string;
  competitionName?: string;
  matchResult?: string;
  resultType?: string;
  createdAt: string;
  sharedBy: string;
  subScores?: Record<string, Record<string, number>>;
  drills?: string[];
};

export default function SharedAnalysisPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [analysis, setAnalysis] = useState<SharedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share?token=${encodeURIComponent(token)}`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to load' }));
          throw new Error(data.error || `Error ${res.status}`);
        }
        return res.json();
      })
      .then(setAnalysis)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading shared analysis...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Analysis Not Found</h1>
          <p className="text-zinc-400">{error || 'This share link may have expired or been removed.'}</p>
        </div>
      </div>
    );
  }

  const scoreColor = (score: number) =>
    score >= 90 ? 'text-green-400' : score >= 80 ? 'text-emerald-400' : score >= 70 ? 'text-yellow-400' : score >= 60 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-sm text-zinc-500 mb-2">LevelUp Wrestling Analysis</div>
          <div className={`text-6xl font-black ${scoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}
          </div>
          <div className="text-zinc-400 text-sm mt-2">
            {analysis.matchStyle.replace(/_/g, ' ')}
            {analysis.competitionName && ` | ${analysis.competitionName}`}
          </div>
          {analysis.matchResult && analysis.matchResult !== 'unknown' && (
            <div className="text-sm mt-1">
              <span className={analysis.matchResult === 'win' ? 'text-green-400' : 'text-red-400'}>
                {analysis.matchResult.toUpperCase()}
              </span>
              {analysis.resultType && ` by ${analysis.resultType.replace(/_/g, ' ')}`}
            </div>
          )}
        </div>

        {/* Position Scores */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(['standing', 'top', 'bottom'] as const).map(pos => (
            <div key={pos} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
              <div className="text-xs text-zinc-500 font-bold mb-1">{pos.toUpperCase()}</div>
              <div className={`text-3xl font-black ${scoreColor(analysis.positionScores[pos])}`}>
                {analysis.positionScores[pos]}
              </div>
            </div>
          ))}
        </div>

        {/* Sub-Scores */}
        {analysis.subScores && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
            <h2 className="text-lg font-semibold mb-4">Sub-Scores</h2>
            {Object.entries(analysis.subScores).map(([position, scores]) => (
              <div key={position} className="mb-4 last:mb-0">
                <h3 className="text-sm font-bold text-zinc-400 mb-2">{position.toUpperCase()}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(scores).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-zinc-400">{key.replace(/_/g, ' ')}</span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-bold text-green-400 mb-2">STRENGTHS</h3>
            <ul className="text-sm space-y-1">
              {analysis.strengths?.map((s, i) => (
                <li key={i} className="text-zinc-300">{s}</li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-bold text-red-400 mb-2">AREAS TO IMPROVE</h3>
            <ul className="text-sm space-y-1">
              {analysis.weaknesses?.map((w, i) => (
                <li key={i} className="text-zinc-300">{w}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Drills */}
        {analysis.drills && analysis.drills.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
            <h2 className="text-lg font-semibold mb-4">Recommended Drills</h2>
            <ul className="space-y-2">
              {analysis.drills.map((drill, i) => (
                <li key={i} className="text-sm text-zinc-300">{drill}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-zinc-600 mt-8">
          <p>Analyzed by LevelUp | {new Date(analysis.createdAt).toLocaleDateString()}</p>
          <p className="mt-1">Shared by {analysis.sharedBy}</p>
        </div>
      </div>
    </div>
  );
}
