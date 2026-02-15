// MatBoss Integration — Feature 10
//
// Imports match records from MatBoss CSV/JSON exports.
// MatBoss is a popular wrestling scoring/stats app used by many teams.
// This module parses exported data and formats it for our database.

export type MatBossMatchRecord = {
  date?: string;
  opponentName: string;
  opponentTeam?: string;
  weightClass: string;
  result: 'win' | 'loss' | 'draw' | 'no_contest';
  resultType: 'pin' | 'tech_fall' | 'major_decision' | 'decision' | 'forfeit' | 'default' | 'disqualification' | 'medical_forfeit';
  wrestlerScore: number;
  opponentScore: number;
  matchDurationSeconds?: number;
  periodScores?: { period1?: string; period2?: string; period3?: string };
  tournamentName?: string;
  tournamentPlacement?: string;
};

export type MatBossImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  records: MatBossMatchRecord[];
};

/**
 * Parse a MatBoss CSV export string into match records.
 * Expected CSV columns: Date, Opponent, Team, Weight, Result, Type, Score, Duration, Tournament
 */
export function parseMatBossCSV(csvContent: string): MatBossImportResult {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    return { success: false, imported: 0, skipped: 0, errors: ['CSV has no data rows'], records: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const records: MatBossMatchRecord[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 5) {
      skipped++;
      continue;
    }

    try {
      const getValue = (key: string): string => {
        const idx = headers.indexOf(key);
        return idx >= 0 && idx < values.length ? values[idx].trim() : '';
      };

      const result = parseResult(getValue('result'));
      const resultType = parseResultType(getValue('type') || getValue('result_type'));

      records.push({
        date: getValue('date') || undefined,
        opponentName: getValue('opponent') || getValue('opponent_name') || 'Unknown',
        opponentTeam: getValue('team') || getValue('opponent_team') || undefined,
        weightClass: getValue('weight') || getValue('weight_class') || '',
        result,
        resultType,
        wrestlerScore: parseInt(getValue('score')?.split('-')[0] || '0', 10),
        opponentScore: parseInt(getValue('score')?.split('-')[1] || '0', 10),
        matchDurationSeconds: parseMatchDuration(getValue('duration') || getValue('time')),
        tournamentName: getValue('tournament') || getValue('event') || undefined,
        tournamentPlacement: getValue('placement') || getValue('place') || undefined,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err}`);
      skipped++;
    }
  }

  return {
    success: errors.length === 0,
    imported: records.length,
    skipped,
    errors,
    records,
  };
}

/**
 * Parse a MatBoss JSON export.
 */
export function parseMatBossJSON(jsonContent: string): MatBossImportResult {
  try {
    const data = JSON.parse(jsonContent);
    const matches = Array.isArray(data) ? data : data.matches || data.results || [];

    if (!Array.isArray(matches) || matches.length === 0) {
      return { success: false, imported: 0, skipped: 0, errors: ['No match data found in JSON'], records: [] };
    }

    const records: MatBossMatchRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      try {
        records.push({
          date: m.date || m.match_date || undefined,
          opponentName: m.opponent || m.opponent_name || 'Unknown',
          opponentTeam: m.team || m.opponent_team || undefined,
          weightClass: m.weight || m.weight_class || '',
          result: parseResult(m.result),
          resultType: parseResultType(m.result_type || m.type),
          wrestlerScore: m.wrestler_score || m.score?.split('-')?.[0] || 0,
          opponentScore: m.opponent_score || m.score?.split('-')?.[1] || 0,
          matchDurationSeconds: m.duration_seconds || parseMatchDuration(m.duration || m.time),
          periodScores: m.period_scores || undefined,
          tournamentName: m.tournament || m.event || undefined,
          tournamentPlacement: m.placement || m.place || undefined,
        });
      } catch (err) {
        errors.push(`Record ${i}: ${err}`);
      }
    }

    return { success: errors.length === 0, imported: records.length, skipped: errors.length, errors, records };
  } catch {
    return { success: false, imported: 0, skipped: 0, errors: ['Invalid JSON format'], records: [] };
  }
}

/**
 * Format a MatBoss record for Supabase insertion.
 */
export function formatForImport(
  record: MatBossMatchRecord,
  wrestlerProfileId: string,
): Record<string, unknown> {
  return {
    wrestler_profile_id: wrestlerProfileId,
    import_source: 'matboss',
    match_date: record.date || null,
    opponent_name: record.opponentName,
    opponent_team: record.opponentTeam || null,
    weight_class: record.weightClass,
    result: record.result,
    result_type: record.resultType,
    wrestler_score: record.wrestlerScore,
    opponent_score: record.opponentScore,
    match_duration_seconds: record.matchDurationSeconds || null,
    period_scores: record.periodScores || null,
    tournament_name: record.tournamentName || null,
    tournament_placement: record.tournamentPlacement || null,
    raw_data: record,
  };
}

// --- Helpers ---

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseResult(raw: string): 'win' | 'loss' | 'draw' | 'no_contest' {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.startsWith('w') || lower === 'win') return 'win';
  if (lower.startsWith('l') || lower === 'loss') return 'loss';
  if (lower === 'draw' || lower === 'd') return 'draw';
  return 'no_contest';
}

function parseResultType(raw: string): MatBossMatchRecord['resultType'] {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.includes('pin') || lower === 'fall' || lower === 'f') return 'pin';
  if (lower.includes('tech') || lower === 'tf') return 'tech_fall';
  if (lower.includes('major') || lower === 'md') return 'major_decision';
  if (lower.includes('dec') || lower === 'd') return 'decision';
  if (lower.includes('forf') || lower === 'ff') return 'forfeit';
  if (lower.includes('default') || lower === 'def') return 'default';
  if (lower.includes('dq') || lower.includes('disq')) return 'disqualification';
  if (lower.includes('med')) return 'medical_forfeit';
  return 'decision';
}

function parseMatchDuration(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  // Handle "M:SS" format
  const timeMatch = raw.match(/(\d+):(\d{2})/);
  if (timeMatch) {
    return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
  }
  // Handle raw seconds
  const seconds = parseInt(raw, 10);
  return isNaN(seconds) ? undefined : seconds;
}
