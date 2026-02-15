'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type SyncHealth = {
  total: number;
  synced: number;
  error: number;
  pending: number;
  syncing: number;
};

type CronLog = {
  id: string;
  job_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  scraped: number;
  new_candidates: number;
  flo_matched: number;
  auto_approved: number;
  auto_synced: number;
  error_message: string | null;
  log_lines: string[] | null;
};

type FailedEvent = {
  id: string;
  name: string;
  start_date: string;
  flo_event_id: string | null;
  bracket_sync_status: string;
  updated_at: string;
};

type UnmatchedItem = {
  id: string;
  name: string;
  start_date: string;
  tw_tournament_id: string | null;
  flo_event_id: string | null;
  status?: string;
};

export default function AdminErrorsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'org_admin';

  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
  const [failedEvents, setFailedEvents] = useState<FailedEvent[]>([]);
  const [unmatchedEvents, setUnmatchedEvents] = useState<UnmatchedItem[]>([]);
  const [unmatchedCandidates, setUnmatchedCandidates] = useState<UnmatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rematching, setRematching] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/errors');
      if (res.ok) {
        const data = await res.json();
        setHealth(data.health);
        setCronLogs(data.cronLogs);
        setFailedEvents(data.failedEvents);
        setUnmatchedEvents(data.unmatchedEvents);
        setUnmatchedCandidates(data.unmatchedCandidates);
      }
    } catch (err) {
      console.error('Failed to load error data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rematchFlo = async (scope: 'events' | 'candidates' | 'all') => {
    setRematching(scope);
    try {
      const res = await fetch('/api/events/rematch-flo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Rematched ${data.matchedCount} items`, 'success');
        await loadData();
      } else {
        showToast(data.error || 'Rematch failed', 'error');
      }
    } catch (err) {
      showToast('Rematch failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setRematching(null);
    }
  };

  const retrySync = async (eventId: string) => {
    setResyncing(eventId);
    try {
      const res = await fetch('/api/events/sync-flo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Synced ${data.bracketsImported} brackets`, 'success');
        await loadData();
      } else {
        showToast(data.error || 'Sync failed', 'error');
      }
    } catch (err) {
      showToast('Sync failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setResyncing(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const cardStyle = {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 20,
    border: '1px solid #27272a',
    marginBottom: 16,
  };

  const sectionTitleStyle = {
    fontSize: 16,
    fontWeight: 700 as const,
    color: '#a1a1aa',
    marginBottom: 12,
    letterSpacing: 0.5,
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
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#71717a', fontFamily: 'system-ui', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>Access Denied</p>
        <p style={{ marginTop: 8 }}>This page is restricted to administrators.</p>
        <a href="/admin/events" style={{ color: '#2563eb', marginTop: 16, display: 'inline-block' }}>&larr; Back to Events</a>
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
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Error Monitoring</h1>
        <a href="/admin/events" style={{ color: '#71717a', fontSize: 14, textDecoration: 'none' }}>&larr; Back to Events</a>
      </div>
      <p style={{ color: '#71717a', marginBottom: 24 }}>Sync health, cron history, and failed operations</p>

      {/* Section 1: Sync Health Overview */}
      {health && (
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Sync Health Overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{health.total}</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>Total Events</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{health.synced}</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>Synced</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>{health.error}</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>Errors</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{health.pending}</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>Pending</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>{health.syncing}</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>Syncing</div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Cron Job History */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>Cron Job History</div>
        {cronLogs.length === 0 ? (
          <div style={{ color: '#52525b', fontSize: 14, textAlign: 'center', padding: 20 }}>
            No cron runs recorded yet. The cron job runs at 8:00 AM and 8:00 PM CT.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>TIME</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>STATUS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>DURATION</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>SCRAPED</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>NEW</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>MATCHED</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>AUTO-SYNCED</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {cronLogs.map((cl) => (
                  <>
                    <tr key={cl.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '8px 10px', color: '#a1a1aa' }}>{formatTime(cl.started_at)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          backgroundColor: cl.status === 'success' ? '#22c55e20' : cl.status === 'error' ? '#ef444420' : '#f59e0b20',
                          color: cl.status === 'success' ? '#22c55e' : cl.status === 'error' ? '#ef4444' : '#f59e0b',
                        }}>
                          {cl.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#71717a' }}>
                        {cl.duration_ms ? `${(cl.duration_ms / 1000).toFixed(1)}s` : '--'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#a1a1aa' }}>{cl.scraped}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: cl.new_candidates > 0 ? '#22c55e' : '#52525b' }}>{cl.new_candidates}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: cl.flo_matched > 0 ? '#3b82f6' : '#52525b' }}>{cl.flo_matched}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: cl.auto_synced > 0 ? '#22c55e' : '#52525b' }}>{cl.auto_synced}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {cl.error_message ? (
                          <span style={{ color: '#ef4444', fontSize: 12 }}>{cl.error_message}</span>
                        ) : (cl.log_lines && cl.log_lines.length > 0) ? (
                          <button
                            onClick={() => setExpandedLog(expandedLog === cl.id ? null : cl.id)}
                            style={{ ...btnStyle('#71717a'), fontSize: 11 }}
                          >
                            {expandedLog === cl.id ? 'Hide' : 'Show'} Logs ({cl.log_lines.length})
                          </button>
                        ) : (
                          <span style={{ color: '#52525b', fontSize: 12 }}>--</span>
                        )}
                      </td>
                    </tr>
                    {expandedLog === cl.id && cl.log_lines && (
                      <tr key={`${cl.id}-logs`}>
                        <td colSpan={8} style={{ padding: '8px 10px' }}>
                          <div style={{
                            backgroundColor: '#0a0a0a', borderRadius: 8, padding: 12,
                            fontFamily: 'monospace', fontSize: 11, color: '#71717a',
                            maxHeight: 200, overflowY: 'auto',
                          }}>
                            {cl.log_lines.map((line, i) => (
                              <div key={i} style={{ marginBottom: 2 }}>{line}</div>
                            ))}
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

      {/* Section 3: Failed Events */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={sectionTitleStyle}>Failed Events ({failedEvents.length})</div>
        </div>
        {failedEvents.length === 0 ? (
          <div style={{ color: '#52525b', fontSize: 14, textAlign: 'center', padding: 20 }}>
            No failed events. All syncs are healthy.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>EVENT</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>DATE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>FLO ID</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>LAST ERROR</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {failedEvents.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '8px 10px', color: '#e4e4e7', fontWeight: 600 }}>{e.name}</td>
                    <td style={{ padding: '8px 10px', color: '#a1a1aa' }}>{formatDate(e.start_date)}</td>
                    <td style={{ padding: '8px 10px', color: '#71717a' }}>{e.flo_event_id || '--'}</td>
                    <td style={{ padding: '8px 10px', color: '#71717a', fontSize: 12 }}>{formatTime(e.updated_at)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {e.flo_event_id && (
                          <button
                            onClick={() => retrySync(e.id)}
                            disabled={resyncing === e.id}
                            style={btnStyle('#3b82f6', resyncing === e.id)}
                          >
                            {resyncing === e.id ? 'Syncing...' : 'Retry Sync'}
                          </button>
                        )}
                        <a href={`/admin/events/${e.id}`} style={{ ...btnStyle('#71717a'), textDecoration: 'none' }}>
                          Edit
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 4: Unmatched Events & Candidates */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={sectionTitleStyle}>
            Unmatched Items ({unmatchedEvents.length} events, {unmatchedCandidates.length} candidates)
          </div>
          <button
            onClick={() => rematchFlo('all')}
            disabled={rematching !== null}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: rematching ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(90deg, #2563eb, #e91e8c)', color: '#fff',
              fontWeight: 700, fontSize: 12, opacity: rematching ? 0.7 : 1,
            }}
          >
            {rematching ? 'Rematching...' : 'Rematch All with Flo'}
          </button>
        </div>

        {unmatchedEvents.length === 0 && unmatchedCandidates.length === 0 ? (
          <div style={{ color: '#52525b', fontSize: 14, textAlign: 'center', padding: 20 }}>
            All events and candidates have Flo matches.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>TYPE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>NAME</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>DATE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>TW ID</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#52525b', fontSize: 11, letterSpacing: 1 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {unmatchedEvents.map((e) => (
                  <tr key={`event-${e.id}`} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: '#2563eb20', color: '#3b82f6' }}>EVENT</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#e4e4e7', fontWeight: 600 }}>{e.name}</td>
                    <td style={{ padding: '8px 10px', color: '#a1a1aa' }}>{formatDate(e.start_date)}</td>
                    <td style={{ padding: '8px 10px', color: '#71717a', fontSize: 12 }}>{e.tw_tournament_id || '--'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <a href={`/admin/events/${e.id}`} style={{ ...btnStyle('#71717a'), textDecoration: 'none' }}>
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
                {unmatchedCandidates.map((c) => (
                  <tr key={`cand-${c.id}`} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: '#e91e8c20', color: '#e91e8c' }}>CANDIDATE</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#e4e4e7', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '8px 10px', color: '#a1a1aa' }}>{formatDate(c.start_date)}</td>
                    <td style={{ padding: '8px 10px', color: '#71717a', fontSize: 12 }}>{c.tw_tournament_id || '--'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <button
                        onClick={() => rematchFlo('candidates')}
                        disabled={rematching !== null}
                        style={btnStyle('#e91e8c', rematching !== null)}
                      >
                        Rematch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
