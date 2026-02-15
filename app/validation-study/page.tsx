'use client';

import { useState, useEffect } from 'react';

type ValidationStats = {
  totalValidations: number;
  totalAnalyses: number;
  avgCorrelation: number;
  positionCorrelations: {
    standing: number;
    top: number;
    bottom: number;
  };
  avgAbsError: number;
  coachCount: number;
  agreementRate: number; // % within 10 points
  recentValidations: Array<{
    id: string;
    analysisId: string;
    coachName: string;
    aiScore: number;
    coachScore: number;
    delta: number;
    createdAt: string;
  }>;
  categoryBreakdown: Array<{
    category: string;
    aiAvg: number;
    coachAvg: number;
    correlation: number;
    sampleSize: number;
  }>;
};

export default function ValidationStudyPage() {
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchValidationStats();
  }, []);

  const fetchValidationStats = async () => {
    try {
      const res = await fetch('/api/admin/validation-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setError('Failed to load validation data');
      }
    } catch (err) {
      console.error('Failed to fetch validation stats:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const CorrelationBadge = ({ value }: { value: number }) => {
    const color = value >= 0.8 ? 'text-green-400' : value >= 0.6 ? 'text-yellow-400' : 'text-red-400';
    const label = value >= 0.8 ? 'Strong' : value >= 0.6 ? 'Moderate' : 'Weak';
    return (
      <span className={`${color} font-bold`}>
        r = {value.toFixed(3)} ({label})
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading validation study data...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Validation Study</h1>
          <p className="text-zinc-400">{error || 'No data available yet. Submit coach validations first.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">LevelUp AI Validation Study</h1>
        <p className="text-zinc-400 mb-8">
          Measuring AI scoring accuracy against expert coach evaluations using Pearson correlation analysis.
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <div className="text-3xl font-black">{stats.totalValidations}</div>
            <div className="text-xs text-zinc-500 font-bold mt-1">VALIDATIONS</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <div className="text-3xl font-black">{stats.coachCount}</div>
            <div className="text-xs text-zinc-500 font-bold mt-1">COACHES</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <div className="text-3xl font-black">{stats.agreementRate}%</div>
            <div className="text-xs text-zinc-500 font-bold mt-1">AGREEMENT</div>
            <div className="text-xs text-zinc-600">within 10pts</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <div className="text-3xl font-black">{stats.avgAbsError.toFixed(1)}</div>
            <div className="text-xs text-zinc-500 font-bold mt-1">AVG ERROR</div>
            <div className="text-xs text-zinc-600">points</div>
          </div>
        </div>

        {/* Overall Correlation */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
          <h2 className="text-lg font-semibold mb-4">Overall AI-Coach Correlation</h2>
          <div className="text-center">
            <div className="text-5xl font-black">
              <CorrelationBadge value={stats.avgCorrelation} />
            </div>
            <p className="text-zinc-400 text-sm mt-2">
              Pearson correlation between AI overall scores and coach overall scores
            </p>
          </div>
        </div>

        {/* Position Correlations */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <h3 className="text-sm font-semibold text-green-500 mb-2">STANDING</h3>
            <CorrelationBadge value={stats.positionCorrelations.standing} />
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <h3 className="text-sm font-semibold text-blue-500 mb-2">TOP</h3>
            <CorrelationBadge value={stats.positionCorrelations.top} />
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <h3 className="text-sm font-semibold text-pink-500 mb-2">BOTTOM</h3>
            <CorrelationBadge value={stats.positionCorrelations.bottom} />
          </div>
        </div>

        {/* Category Breakdown */}
        {stats.categoryBreakdown.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
            <h2 className="text-lg font-semibold mb-4">Sub-Score Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-left">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-center">AI Avg</th>
                    <th className="pb-2 text-center">Coach Avg</th>
                    <th className="pb-2 text-center">Correlation</th>
                    <th className="pb-2 text-center">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.categoryBreakdown.map((cat) => (
                    <tr key={cat.category} className="border-t border-zinc-800">
                      <td className="py-2 font-medium">{cat.category.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-center">{cat.aiAvg.toFixed(1)}</td>
                      <td className="py-2 text-center">{cat.coachAvg.toFixed(1)}</td>
                      <td className="py-2 text-center">
                        <CorrelationBadge value={cat.correlation} />
                      </td>
                      <td className="py-2 text-center text-zinc-500">{cat.sampleSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Validations */}
        {stats.recentValidations.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Recent Validations</h2>
            <div className="space-y-3">
              {stats.recentValidations.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <span className="font-medium">{v.coachName}</span>
                    <span className="text-zinc-500 text-sm ml-2">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">AI: {v.aiScore}</span>
                    <span className="text-zinc-400">Coach: {v.coachScore}</span>
                    <span className={`font-bold ${Math.abs(v.delta) <= 5 ? 'text-green-400' : Math.abs(v.delta) <= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {v.delta > 0 ? '+' : ''}{v.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Methodology Note */}
        <div className="mt-8 text-xs text-zinc-600 text-center">
          <p>
            Correlation values: r &gt; 0.8 = strong agreement, 0.6-0.8 = moderate, &lt; 0.6 = needs calibration.
            Agreement rate = % of validations where AI and coach scores are within 10 points.
          </p>
        </div>
      </div>
    </div>
  );
}
