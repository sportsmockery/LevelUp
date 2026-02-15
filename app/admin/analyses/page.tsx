'use client';

import { useState, useEffect, useCallback } from 'react';

type Analysis = {
  id: string;
  created_at: string;
  overall_score: number;
  standing: number;
  top: number;
  bottom: number;
  confidence: number | null;
  identity_confidence: number | null;
  quality_flags: Array<{ check: string; severity: string; detail: string }> | null;
  hallucination_warnings: string[] | null;
  pipeline_version: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  match_style: string | null;
  job_status: string | null;
  error_message: string | null;
};

export default function AdminAnalysesPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low_confidence' | 'unreviewed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'low_confidence' ? '?low_confidence=true' : '';
      const res = await fetch(`/api/admin/analyses${params}`);
      if (res.ok) {
        const data = await res.json();
        let items = data.analyses || [];
        if (filter === 'unreviewed') {
          items = items.filter((a: Analysis) => !a.reviewed_by);
        }
        setAnalyses(items);
      }
    } catch (err) {
      console.error('Failed to load analyses:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markReviewed = async (id: string) => {
    setReviewingId(id);
    try {
      const res = await fetch(`/api/admin/analyses/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed_by: 'admin' }),
      });
      if (res.ok) {
        showToast('Marked as reviewed', 'success');
        await loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Review failed', 'error');
      }
    } catch {
      showToast('Review failed', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const confColor = (conf: number | null) => {
    if (conf === null) return '#52525b';
    if (conf >= 0.8) return '#22c55e';
    if (conf >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  const severityColor = (s: string) => {
    if (s === 'error') return '#ef4444';
    if (s === 'warning') return '#f59e0b';
    return '#71717a';
  };

  const cardStyle = {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 20,
    border: '1px solid #27272a',
    marginBottom: 16,
  };

  const btnStyle = (color: string, disabled?: boolean) => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: disabled ? 'not-allowed' as const : 'pointer' as const,
    backgroundColor: `${color}20`,
    color,
    fontSize: 12,
    fontWeight: 600 as const,
    opacity: disabled ? 0.6 : 1,
  });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#71717a', fontFamily: 'system-ui', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
        Loading analyses...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 8, zIndex: 1000,
          backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: '#fff', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Analysis Review</h1>
        <a href="/admin/events" style={{ color: '#71717a', fontSize: 14, textDecoration: 'none' }}>&larr; Back to Events</a>
      </div>
      <p style={{ color: '#71717a', marginBottom: 24 }}>Coach review of AI analyses — confidence, quality flags, and identity tracking</p>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'low_confidence', 'unreviewed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              backgroundColor: filter === f ? '#2563eb' : '#27272a',
              color: filter === f ? '#fff' : '#a1a1aa',
              fontSize: 13, fontWeight: 600,
            }}
          >
            {f === 'all' ? 'All' : f === 'low_confidence' ? 'Low Confidence' : 'Unreviewed'}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{analyses.length}</div>
            <div style={{ fontSize: 12, color: '#71717a' }}>Analyses</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>
              {analyses.filter(a => a.reviewed_by).length}
            </div>
            <div style={{ fontSize: 12, color: '#71717a' }}>Reviewed</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>
              {analyses.filter(a => a.identity_confidence !== null && a.identity_confidence < 0.5).length}
            </div>
            <div style={{ fontSize: 12, color: '#71717a' }}>Low Identity Conf.</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
              {analyses.filter(a => (a.quality_flags?.length ?? 0) > 0).length}
            </div>
            <div style={{ fontSize: 12, color: '#71717a' }}>With Flags</div>
          </div>
        </div>
      </div>

      {/* Analyses Table */}
      <div style={cardStyle}>
        {analyses.length === 0 ? (
          <div style={{ color: '#52525b', fontSize: 14, textAlign: 'center', padding: 20 }}>
            No analyses found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>DATE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>SCORE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>CONF.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>IDENTITY</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>FLAGS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>VERSION</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>STATUS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((a) => (
                  <>
                    <tr key={a.id} style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                      <td style={{ padding: '8px 10px', color: '#a1a1aa' }}>{formatTime(a.created_at)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>
                        <span style={{ color: a.overall_score >= 70 ? '#22c55e' : a.overall_score >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {a.overall_score}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: confColor(a.confidence) }}>
                        {a.confidence !== null ? `${Math.round(a.confidence * 100)}%` : '--'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: confColor(a.identity_confidence) }}>
                        {a.identity_confidence !== null ? `${Math.round(a.identity_confidence * 100)}%` : '--'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {(a.quality_flags?.length ?? 0) > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                            {a.quality_flags!.length}
                          </span>
                        ) : (
                          <span style={{ color: '#52525b' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11 }}>
                        {a.pipeline_version || '--'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {a.reviewed_by ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: '#22c55e20', color: '#22c55e' }}>
                            REVIEWED
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: '#27272a', color: '#71717a' }}>
                            PENDING
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        {!a.reviewed_by && (
                          <button
                            onClick={() => markReviewed(a.id)}
                            disabled={reviewingId === a.id}
                            style={btnStyle('#22c55e', reviewingId === a.id)}
                          >
                            {reviewingId === a.id ? 'Saving...' : 'Mark Reviewed'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === a.id && (
                      <tr key={`${a.id}-details`}>
                        <td colSpan={8} style={{ padding: '12px 10px' }}>
                          <div style={{ backgroundColor: '#0a0a0a', borderRadius: 10, padding: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                              <div>
                                <div style={{ fontSize: 11, color: '#52525b', marginBottom: 2 }}>Standing</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#e4e4e7' }}>{a.standing}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#52525b', marginBottom: 2 }}>Top</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#e4e4e7' }}>{a.top}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#52525b', marginBottom: 2 }}>Bottom</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#e4e4e7' }}>{a.bottom}</div>
                              </div>
                            </div>
                            {a.match_style && (
                              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 8 }}>
                                Style: {a.match_style}
                              </div>
                            )}
                            {(a.hallucination_warnings?.length ?? 0) > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>HALLUCINATION WARNINGS</div>
                                {a.hallucination_warnings!.map((w, i) => (
                                  <div key={i} style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 2, paddingLeft: 8 }}>
                                    {w}
                                  </div>
                                ))}
                              </div>
                            )}
                            {(a.quality_flags?.length ?? 0) > 0 && (
                              <div>
                                <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>QUALITY FLAGS</div>
                                {a.quality_flags!.map((f, i) => (
                                  <div key={i} style={{ fontSize: 12, color: severityColor(f.severity), marginBottom: 2, paddingLeft: 8 }}>
                                    [{f.severity.toUpperCase()}] {f.check}: {f.detail}
                                  </div>
                                ))}
                              </div>
                            )}
                            {a.reviewed_by && (
                              <div style={{ marginTop: 12, fontSize: 12, color: '#52525b' }}>
                                Reviewed by {a.reviewed_by} on {a.reviewed_at ? formatTime(a.reviewed_at) : '--'}
                              </div>
                            )}
                            {a.error_message && (
                              <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>
                                Error: {a.error_message}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
