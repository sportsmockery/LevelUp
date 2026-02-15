// TrackWrestling Wrestler Record Import — Feature 10
//
// Extends the existing TW event scraper to import wrestler records.
// Parses wrestler profiles, win/loss records, and match results
// from TrackWrestling's public pages.

import * as cheerio from 'cheerio';

const TW_TIMEOUT_MS = 15000;

export type TwWrestlerRecord = {
  twWrestlerId?: string;
  name: string;
  team: string;
  weightClass: string;
  grade?: string;
  wins: number;
  losses: number;
  pins: number;
  techFalls: number;
  majorDecisions: number;
  season: string;
};

export type TwMatchResult = {
  date?: string;
  opponentName: string;
  opponentTeam: string;
  weightClass: string;
  result: 'win' | 'loss' | 'draw';
  resultType: string; // "Pin", "Dec", "TF", "MD", "FF"
  score?: string; // e.g., "7-3"
  period?: string;
  tournamentName?: string;
};

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Search TrackWrestling for a wrestler by name and team.
 * Returns matching wrestler records from the public search.
 */
export async function searchTwWrestler(
  lastName: string,
  firstName?: string,
  teamName?: string,
  state: string = 'IL',
): Promise<TwWrestlerRecord[]> {
  // TrackWrestling state codes: IL=16
  const stateCode = STATE_CODES[state.toUpperCase()] || '16';

  const params = new URLSearchParams({
    lastName: lastName,
    ...(firstName ? { firstName } : {}),
    ...(teamName ? { teamName } : {}),
    state: stateCode,
  });

  const url = `https://www.trackwrestling.com/Login.jsp?${params.toString()}`;

  try {
    const response = await fetch(url, {
      signal: createTimeoutSignal(TW_TIMEOUT_MS),
      headers: {
        'User-Agent': 'LevelUp-Wrestling/1.0',
        Accept: 'text/html',
      },
    });

    if (!response.ok) {
      console.error(`[TW] Search returned ${response.status}`);
      return [];
    }

    const html = await response.text();
    return parseWrestlerSearchResults(html);
  } catch (error) {
    console.error('[TW] Wrestler search error:', error);
    return [];
  }
}

/**
 * Parse wrestler search results from TrackWrestling HTML.
 */
function parseWrestlerSearchResults(html: string): TwWrestlerRecord[] {
  const $ = cheerio.load(html);
  const wrestlers: TwWrestlerRecord[] = [];

  // TW wrestler results are in table rows
  $('table.DataGridTable tr').each((idx, row) => {
    if (idx === 0) return; // Skip header
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    try {
      const name = $(cells[0]).text().trim();
      const team = $(cells[1]).text().trim();
      const weightClass = $(cells[2]).text().trim();
      const recordText = $(cells[3]).text().trim();

      if (!name) return;

      // Parse W-L record (e.g., "25-3")
      const recordMatch = recordText.match(/(\d+)\s*-\s*(\d+)/);
      const wins = recordMatch ? parseInt(recordMatch[1], 10) : 0;
      const losses = recordMatch ? parseInt(recordMatch[2], 10) : 0;

      // Try to get wrestler ID from link
      const link = $(cells[0]).find('a').attr('href') || '';
      const idMatch = link.match(/athleteId=(\d+)/);

      wrestlers.push({
        twWrestlerId: idMatch ? idMatch[1] : undefined,
        name,
        team,
        weightClass,
        wins,
        losses,
        pins: 0,
        techFalls: 0,
        majorDecisions: 0,
        season: new Date().getFullYear().toString(),
      });
    } catch {
      // Skip malformed rows
    }
  });

  return wrestlers;
}

/**
 * Import a wrestler's record into the database format.
 * Returns the record ready for Supabase insertion.
 */
export function formatForImport(
  wrestler: TwWrestlerRecord,
  wrestlerProfileId?: string,
): Record<string, unknown> {
  return {
    tw_wrestler_id: wrestler.twWrestlerId,
    wrestler_profile_id: wrestlerProfileId || null,
    name: wrestler.name,
    team: wrestler.team,
    weight_class: wrestler.weightClass,
    grade: wrestler.grade,
    wins: wrestler.wins,
    losses: wrestler.losses,
    pins: wrestler.pins,
    tech_falls: wrestler.techFalls,
    major_decisions: wrestler.majorDecisions,
    season: wrestler.season,
    raw_data: wrestler,
  };
}

// US state abbreviation to TrackWrestling state code mapping
const STATE_CODES: Record<string, string> = {
  AL: '1', AK: '2', AZ: '3', AR: '4', CA: '5', CO: '6', CT: '7', DE: '8',
  FL: '9', GA: '10', HI: '11', ID: '12', IL: '16', IN: '17', IA: '15',
  KS: '18', KY: '19', LA: '20', ME: '21', MD: '22', MA: '23', MI: '24',
  MN: '25', MS: '26', MO: '27', MT: '28', NE: '29', NV: '30', NH: '31',
  NJ: '32', NM: '33', NY: '34', NC: '35', ND: '36', OH: '37', OK: '38',
  OR: '39', PA: '40', RI: '41', SC: '42', SD: '43', TN: '44', TX: '45',
  UT: '46', VT: '47', VA: '48', WA: '49', WV: '50', WI: '51', WY: '52',
};
