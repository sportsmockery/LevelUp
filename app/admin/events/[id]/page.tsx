'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { parseFloEventId } from '@/lib/flo-api';
import { useAuth } from '@/contexts/AuthContext';

type EventData = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location_city: string | null;
  location_state: string | null;
  venue: string | null;
  street: string | null;
  zip: string | null;
  style: string | null;
  age_divisions: string[] | null;
  tw_tournament_id: string | null;
  flo_event_id: string | null;
  flo_bracket_url: string | null;
  bracket_sync_status: string | null;
  total_brackets: number;
  total_bouts: number;
};

type BracketData = {
  id: string;
  weight_class: string;
  participant_count: number;
  bout_count: number;
  synced_at: string;
  bouts: {
    round_name: string;
    top_wrestler_name: string | null;
    bottom_wrestler_name: string | null;
    top_wrestler_team: string | null;
    bottom_wrestler_team: string | null;
    top_wrestler_score: number;
    bottom_wrestler_score: number;
    win_type: string | null;
  }[];
  placements: {
    place: string;
    wrestler_name: string;
    team_name: string | null;
  }[];
};

const STYLE_OPTIONS = ['Folkstyle', 'Freestyle', 'Greco-Roman'];
const AGE_OPTIONS = ['Youth', 'Middle School', 'High School', 'College', 'Open'];

export default function EventEditPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'org_admin';
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [brackets, setBrackets] = useState<BracketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [venue, setVenue] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [style, setStyle] = useState('');
  const [ageDivisions, setAgeDivisions] = useState<string[]>([]);
  const [twId, setTwId] = useState('');
  const [floBracketUrl, setFloBracketUrl] = useState('');
  const [floEventId, setFloEventId] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mobile/brackets/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        const e = data.event;
        setEvent(e);
        setBrackets(data.brackets || []);

        // Populate form
        setName(e.name || '');
        setStartDate(e.start_date || '');
        setEndDate(e.end_date || '');
        setCity(e.location_city || '');
        setState(e.location_state || '');
        setVenue(e.venue || '');
        setStreet(e.street || '');
        setZip(e.zip || '');
        setStyle(e.style || '');
        setAgeDivisions(e.age_divisions || []);
        setTwId(e.tw_tournament_id || '');
        setFloBracketUrl(e.flo_bracket_url || '');
        setFloEventId(e.flo_event_id || '');
      }
    } catch (err) {
      console.error('Failed to load event:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleFloBracketUrlChange = (url: string) => {
    setFloBracketUrl(url);
    const extracted = parseFloEventId(url);
    if (extracted) {
      setFloEventId(extracted);
    }
  };

  const saveEvent = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/update-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name,
          start_date: startDate,
          end_date: endDate || null,
          location_city: city || null,
          location_state: state || null,
          venue: venue || null,
          street: street || null,
          zip: zip || null,
          style: style || null,
          age_divisions: ageDivisions.length > 0 ? ageDivisions : null,
          tw_tournament_id: twId || null,
          flo_bracket_url: floBracketUrl || null,
          flo_event_id: floEventId || null,
        }),
      });
      if (res.ok) {
        showToast('Event saved', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Save failed', 'error');
      }
    } catch (err) {
      showToast('Save failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  const syncBrackets = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/events/sync-flo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Synced ${data.bracketsImported} brackets, ${data.boutsImported} bouts`, 'success');
        await loadEvent();
      } else {
        showToast(data.error || 'Sync failed', 'error');
      }
    } catch (err) {
      showToast('Sync failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #27272a',
    backgroundColor: '#18181b', color: '#fff', fontSize: 14, outline: 'none',
    boxSizing: 'border-box' as const,
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 4, display: 'block' as const };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#71717a', fontFamily: 'system-ui', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 8, zIndex: 1000,
          backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: '#fff', fontWeight: 600, fontSize: 14,
        }}>
          {toast.message}
        </div>
      )}

      <a href="/admin/events" style={{ color: '#71717a', fontSize: 14, textDecoration: 'none' }}>&larr; Back to Events</a>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 12, marginBottom: 24 }}>{isAdmin ? 'Edit Event' : 'Event Details'}</h1>

      {/* Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Event Name</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <input style={inputStyle} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>City</label>
          <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>State</label>
          <input style={inputStyle} value={state} onChange={(e) => setState(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>Venue</label>
          <input style={inputStyle} value={venue} onChange={(e) => setVenue(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>Street</label>
          <input style={inputStyle} value={street} onChange={(e) => setStreet(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>Zip</label>
          <input style={inputStyle} value={zip} onChange={(e) => setZip(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>Style</label>
          {isAdmin ? (
            <select style={inputStyle} value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="">Select style</option>
              {STYLE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input style={inputStyle} value={style || '--'} readOnly />
          )}
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Age Divisions</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AGE_OPTIONS.map((a) => (
              <button
                key={a}
                onClick={() => isAdmin && setAgeDivisions((prev) =>
                  prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                )}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                  borderColor: ageDivisions.includes(a) ? '#2563eb' : '#27272a',
                  backgroundColor: ageDivisions.includes(a) ? '#2563eb20' : '#18181b',
                  color: ageDivisions.includes(a) ? '#2563eb' : '#71717a',
                  fontSize: 13, fontWeight: 600, cursor: isAdmin ? 'pointer' : 'default',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>TW Tournament ID</label>
          <input style={inputStyle} value={twId} onChange={(e) => setTwId(e.target.value)} readOnly={!isAdmin} />
        </div>
        <div>
          <label style={labelStyle}>Flo Bracket URL</label>
          <input style={inputStyle} value={floBracketUrl} onChange={(e) => handleFloBracketUrlChange(e.target.value)} readOnly={!isAdmin} placeholder="https://www.flowrestling.org/nextgen/events/12345/brackets" />
        </div>
        <div>
          <label style={labelStyle}>Flo Event ID (auto-filled)</label>
          <input style={{ ...inputStyle, backgroundColor: '#111', color: '#52525b' }} value={floEventId} readOnly />
        </div>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <button
            onClick={saveEvent}
            disabled={saving}
            style={{
              padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg, #2563eb, #e91e8c)', color: '#fff',
              fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Event'}
          </button>
          {floEventId && (
            <button
              onClick={syncBrackets}
              disabled={syncing}
              style={{
                padding: '12px 24px', borderRadius: 10, border: '1.5px solid #2563eb',
                backgroundColor: '#2563eb20', color: '#2563eb', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, opacity: syncing ? 0.7 : 1,
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Brackets from Flo'}
            </button>
          )}
        </div>
      )}

      {/* Bracket Data */}
      {brackets.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#a1a1aa' }}>Synced Brackets ({brackets.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {brackets.map((b) => (
              <div key={b.id} style={{ backgroundColor: '#18181b', borderRadius: 14, padding: 16, border: '1px solid #27272a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{b.weight_class}</span>
                  <span style={{ fontSize: 12, color: '#52525b' }}>{b.participant_count} wrestlers</span>
                </div>
                <div style={{ fontSize: 13, color: '#71717a', marginBottom: 8 }}>
                  {b.bout_count} bouts
                </div>
                {b.placements && b.placements.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', letterSpacing: 1, marginBottom: 4 }}>TOP PLACERS</div>
                    {b.placements.slice(0, 4).map((p, idx) => (
                      <div key={idx} style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 2 }}>
                        <span style={{ color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : '#71717a', fontWeight: 700 }}>
                          {p.place}.
                        </span>{' '}
                        {p.wrestler_name} <span style={{ color: '#52525b' }}>({p.team_name})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
