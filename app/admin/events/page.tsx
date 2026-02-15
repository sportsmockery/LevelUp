'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseFloEventId } from '@/lib/flo-api';
import { useAuth } from '@/contexts/AuthContext';

type EventRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location_city: string | null;
  location_state: string | null;
  venue: string | null;
  flo_event_id: string | null;
  tw_tournament_id: string | null;
  bracket_sync_status: string | null;
  total_brackets: number;
  total_bouts: number;
  bracket_synced_at: string | null;
};

type CandidateRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  venue: string | null;
  location_city: string | null;
  location_state: string | null;
  tw_tournament_id: string | null;
  flo_event_id: string | null;
  match_confidence: number | null;
  status: string;
};

export default function AdminEventsPage() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'org_admin';

  const [tab, setTab] = useState<'approved' | 'candidates'>('approved');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, candidatesRes] = await Promise.all([
        fetch('/api/mobile/events?limit=100'),
        fetch('/api/mobile/events?limit=0'), // We'll load candidates via supabase directly
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }

      // Load candidates (pending ones)
      const candidateRes = await fetch('/api/admin/candidates');
      if (candidateRes.ok) {
        const data = await candidateRes.json();
        setCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const discoverEvents = async () => {
    setActionLoading('discover');
    try {
      const res = await fetch('/api/events/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: 2 }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Discovered ${data.newCandidates} new events (${data.floMatched} matched to Flo)`, 'success');
        await loadData();
      } else {
        showToast(data.error || 'Discovery failed', 'error');
      }
    } catch (err) {
      showToast('Discovery failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const syncBrackets = async (eventId: string) => {
    setActionLoading(`sync-${eventId}`);
    try {
      const res = await fetch('/api/events/sync-flo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Synced ${data.bracketsImported} brackets, ${data.boutsImported} bouts`, 'success');
        await loadData();
      } else {
        showToast(data.error || 'Sync failed', 'error');
      }
    } catch (err) {
      showToast('Sync failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const approveCandidate = async (candidate: CandidateRow, syncAfter: boolean = false) => {
    setActionLoading(`approve-${candidate.id}`);
    try {
      const res = await fetch('/api/admin/approve-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id, syncBrackets: syncAfter }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Approved: ${candidate.name}${syncAfter ? ` (${data.bracketsImported || 0} brackets synced)` : ''}`, 'success');
        await loadData();
      } else {
        showToast(data.error || 'Approval failed', 'error');
      }
    } catch (err) {
      showToast('Approval failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const dismissCandidate = async (candidateId: string) => {
    setActionLoading(`dismiss-${candidateId}`);
    try {
      const res = await fetch('/api/admin/dismiss-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      });
      if (res.ok) {
        showToast('Candidate dismissed', 'success');
        await loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Dismiss failed', 'error');
      }
    } catch (err) {
      showToast('Dismiss failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const approveAllMatched = async () => {
    const matched = candidates.filter((c) => c.flo_event_id && c.status === 'pending');
    if (matched.length === 0) {
      showToast('No matched candidates to approve', 'error');
      return;
    }
    setActionLoading('approve-all');
    let approved = 0;
    for (const c of matched) {
      try {
        await approveCandidate(c, true);
        approved++;
      } catch {
        // Continue with next
      }
    }
    showToast(`Approved ${approved}/${matched.length} matched events`, 'success');
    setActionLoading(null);
    await loadData();
  };

  const pendingCandidates = candidates.filter((c) => c.status === 'pending');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      {/* Toast */}
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
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Events {isAdmin ? 'Management' : ''}</h1>
        {isAdmin && (
          <a href="/admin/errors" style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Error Monitoring &rarr;
          </a>
        )}
      </div>
      <p style={{ color: '#71717a', marginBottom: 24 }}>
        {isAdmin ? 'Manage wrestling events, brackets, and results' : 'Browse upcoming and recent wrestling events'}
      </p>

      {/* Top Bar — Admin only */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={discoverEvents}
            disabled={actionLoading === 'discover'}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg, #2563eb, #e91e8c)', color: '#fff',
              fontWeight: 700, fontSize: 14, opacity: actionLoading === 'discover' ? 0.7 : 1,
            }}
          >
            {actionLoading === 'discover' ? 'Discovering...' : 'Discover Events from TW'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setTab('approved')}
          style={{
            padding: '10px 20px', borderRadius: 10, border: '1.5px solid',
            borderColor: tab === 'approved' ? '#2563eb' : '#27272a',
            backgroundColor: tab === 'approved' ? '#2563eb20' : '#18181b',
            color: tab === 'approved' ? '#2563eb' : '#71717a',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          {isAdmin ? 'Approved ' : ''}Events ({events.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab('candidates')}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1.5px solid',
              borderColor: tab === 'candidates' ? '#e91e8c' : '#27272a',
              backgroundColor: tab === 'candidates' ? '#e91e8c20' : '#18181b',
              color: tab === 'candidates' ? '#e91e8c' : '#71717a',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', position: 'relative',
            }}
          >
            Pending Candidates
            {pendingCandidates.length > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6, backgroundColor: '#e91e8c',
                color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 10,
              }}>
                {pendingCandidates.length}
              </span>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#71717a' }}>Loading...</div>
      ) : tab === 'approved' ? (
        /* Approved Events Table */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>NAME</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>DATES</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>CITY/STATE</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>FLO?</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>BRACKETS?</th>
                {isAdmin && <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>LAST SYNCED</th>}
                {isAdmin && <th style={{ padding: '10px 12px', textAlign: 'right', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '12px', color: '#e4e4e7', fontWeight: 600 }}>{event.name}</td>
                  <td style={{ padding: '12px', color: '#a1a1aa' }}>
                    {formatDate(event.start_date)}
                    {event.end_date ? ` - ${formatDate(event.end_date)}` : ''}
                  </td>
                  <td style={{ padding: '12px', color: '#a1a1aa' }}>
                    {[event.location_city, event.location_state].filter(Boolean).join(', ')}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ color: event.flo_event_id ? '#22c55e' : '#ef4444' }}>
                      {event.flo_event_id ? '\u2713' : '\u2717'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {event.bracket_sync_status === 'synced' && event.total_brackets > 0 ? (
                      <span style={{ color: '#22c55e' }}>{'\u2713'} {event.total_brackets}</span>
                    ) : (
                      <span style={{ color: '#52525b' }}>{'\u2717'}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px', color: '#52525b', fontSize: 12 }}>
                      {event.bracket_synced_at ? new Date(event.bracket_synced_at).toLocaleString() : '--'}
                    </td>
                  )}
                  {isAdmin && (
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <a href={`/admin/events/${event.id}`} style={{
                          padding: '6px 12px', borderRadius: 8, backgroundColor: '#27272a',
                          color: '#a1a1aa', fontSize: 12, fontWeight: 600, textDecoration: 'none',
                        }}>Edit</a>
                        {event.flo_event_id && (
                          <button
                            onClick={() => syncBrackets(event.id)}
                            disabled={actionLoading === `sync-${event.id}`}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              backgroundColor: '#2563eb20', color: '#2563eb', fontSize: 12, fontWeight: 600,
                              opacity: actionLoading === `sync-${event.id}` ? 0.7 : 1,
                            }}
                          >
                            {actionLoading === `sync-${event.id}` ? 'Syncing...' : 'Sync Brackets'}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} style={{ padding: 40, textAlign: 'center', color: '#52525b' }}>
                    {isAdmin ? 'No approved events yet. Discover events from TrackWrestling to get started.' : 'No events available yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Candidates Tab */
        <div>
          {pendingCandidates.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={approveAllMatched}
                disabled={actionLoading === 'approve-all'}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  backgroundColor: '#22c55e20', color: '#22c55e', fontSize: 13, fontWeight: 600,
                  opacity: actionLoading === 'approve-all' ? 0.7 : 1,
                }}
              >
                {actionLoading === 'approve-all' ? 'Approving...' : `Approve All Matched (${pendingCandidates.filter(c => c.flo_event_id).length})`}
              </button>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>NAME</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>DATES</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>VENUE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>CITY</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>FLO MATCH?</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#71717a', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pendingCandidates.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '12px', color: '#e4e4e7', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '12px', color: '#a1a1aa' }}>
                      {formatDate(c.start_date)}
                      {c.end_date ? ` - ${formatDate(c.end_date)}` : ''}
                    </td>
                    <td style={{ padding: '12px', color: '#a1a1aa' }}>{c.venue || '--'}</td>
                    <td style={{ padding: '12px', color: '#a1a1aa' }}>
                      {[c.location_city, c.location_state].filter(Boolean).join(', ')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {c.flo_event_id ? (
                        <span style={{ color: '#22c55e', fontSize: 12 }}>
                          Flo #{c.flo_event_id} {c.match_confidence ? `(${c.match_confidence}%)` : ''}
                        </span>
                      ) : (
                        <span style={{ color: '#52525b', fontSize: 12 }}>Not found</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => approveCandidate(c, false)}
                          disabled={!!actionLoading}
                          style={{
                            padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            backgroundColor: '#22c55e20', color: '#22c55e', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          Approve
                        </button>
                        {c.flo_event_id && (
                          <button
                            onClick={() => approveCandidate(c, true)}
                            disabled={!!actionLoading}
                            style={{
                              padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                              backgroundColor: '#2563eb20', color: '#2563eb', fontSize: 12, fontWeight: 600,
                            }}
                          >
                            Approve + Sync
                          </button>
                        )}
                        <button
                          onClick={() => dismissCandidate(c.id)}
                          disabled={!!actionLoading}
                          style={{
                            padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            backgroundColor: '#27272a', color: '#71717a', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingCandidates.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#52525b' }}>
                      No pending candidates. Use &quot;Discover Events from TW&quot; to find new events.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
