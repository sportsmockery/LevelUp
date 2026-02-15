// /levelup/lib/flo-api.ts
// FloWrestling public API client — all endpoints confirmed no-auth, Status 200

const FLO_API_BASE = 'https://prod-web-api.flowrestling.org/api/event-hub';
const DEFAULT_TIMEOUT_MS = 10000;
const BATCH_DELAY_MS = 500;
const RATE_LIMIT_DELAY_MS = 200;

// ============================================================
// TYPES
// ============================================================

export type FloEventInfo = {
  floEventId: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  state: string;
  zip: string;
  street: string;
  country: string;
};

export type FloBracketOption = {
  bracketId: string;
  weightClass: string;
  isDisabled: boolean;
};

export type FloParticipant = {
  id: string;
  winner: boolean;
  displayName: string;
  displayTeamName: string;
  teamName: string;
  name: string;
  team: string;
  seed: number;
  score: number;
  highlightColor: string;
};

export type FloBout = {
  id: string;
  matchNumber: string | null;
  result: string | null;
  roundName: string | null;
  state: string;
  placement: string | null;
  winType: string | null;
  topParticipant: FloParticipant | null;
  bottomParticipant: FloParticipant | null;
  winnerToTop: boolean;
  loserToTop: boolean;
  boutVideoUrl: string | null;
  x: number;
  y: number;
};

export type FloPlacement = {
  place: string;
  participantId: string;
  name: string;
  teamName: string;
};

export type FloBracketData = {
  weightClass: string;
  participantCount: number;
  bouts: FloBout[];
  placements: FloPlacement[];
};

export type FloFullEventData = {
  event: FloEventInfo;
  brackets: FloBracketData[];
  errors: string[];
};

// ============================================================
// HELPERS
// ============================================================

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function floFetch<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const response = await fetch(url, {
    signal: createTimeoutSignal(timeoutMs),
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'LevelUp-Wrestling/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Flo API error: ${response.status} ${response.statusText} for ${url}`);
  }

  const json = await response.json();

  // Check for Flo-specific error notifications
  if (json.notifications?.length > 0) {
    const errorNotif = json.notifications.find((n: Record<string, string>) => n.type === 'error');
    if (errorNotif && !json.data) {
      throw new Error(`Flo API notification error: ${errorNotif.message}`);
    }
  }

  return json;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseFloEventId(url: string): string | null {
  const match = url.match(/nextgen\/events\/(\d+)/);
  return match ? match[1] : null;
}

function normalizeEventName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function extractSharedWords(a: string, b: string): number {
  const wordsA = new Set(normalizeEventName(a).split(' '));
  const wordsB = normalizeEventName(b).split(' ');
  let count = 0;
  for (const w of wordsB) {
    if (wordsA.has(w) && w.length > 2) count++;
  }
  return count;
}

// ============================================================
// CORE API FUNCTIONS
// ============================================================

export async function getEventInfo(floEventId: string): Promise<FloEventInfo> {
  const url = `${FLO_API_BASE}/${floEventId}/information?filter=null&search=null`;

  try {
    const json = await floFetch<Record<string, Record<string, Record<string, string>>>>(url);

    if (!json.data) {
      throw new Error(`No data returned for Flo event ${floEventId}`);
    }

    const d = json.data as Record<string, Record<string, string> | string>;
    const loc = (d.location || {}) as Record<string, Record<string, string> | string>;
    const addr = (loc.address || {}) as Record<string, string>;

    return {
      floEventId,
      title: (d.title as string) || '',
      startDate: (d.startDate as string) || '',
      endDate: (d.endDate as string) || '',
      venue: (loc.name as string) || '',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      street: addr.street || '',
      country: addr.country || 'US',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout fetching Flo event info for ID ${floEventId}`);
    }
    throw error;
  }
}

export async function getBracketDivisions(floEventId: string): Promise<FloBracketOption[]> {
  const url = `${FLO_API_BASE}/${floEventId}/brackets/divisions`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await floFetch<any>(url);

    if (!json.data?.bracketOptionsContent?.bracketOptions) {
      throw new Error(`No bracket divisions found for Flo event ${floEventId}`);
    }

    const bracketOptions = json.data.bracketOptionsContent.bracketOptions;
    const divisionKeys = Object.keys(bracketOptions);

    if (divisionKeys.length === 0) {
      return [];
    }

    const allBrackets: FloBracketOption[] = [];

    for (const key of divisionKeys) {
      const options = bracketOptions[key];
      if (!Array.isArray(options)) continue;

      for (const opt of options) {
        allBrackets.push({
          bracketId: opt.bracketId,
          weightClass: opt.text,
          isDisabled: opt.isDisabled || false,
        });
      }
    }

    return allBrackets.sort((a, b) => {
      const numA = parseInt(a.weightClass, 10);
      const numB = parseInt(b.weightClass, 10);
      if (isNaN(numA) && isNaN(numB)) return a.weightClass.localeCompare(b.weightClass);
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numA - numB;
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout fetching bracket divisions for Flo event ${floEventId}`);
    }
    throw error;
  }
}

export async function getBracketBouts(
  floEventId: string,
  bracketId: string
): Promise<{ weightClass: string; participantCount: number; bouts: FloBout[] }> {
  const url = `${FLO_API_BASE}/${floEventId}/brackets/${bracketId}?filter=null&search=null&tab=null&refresh=false`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await floFetch<any>(url);

    if (!json.data) {
      throw new Error(`No bracket data for bracketId ${bracketId} in event ${floEventId}`);
    }

    const { name, count, matches } = json.data;

    if (!matches || typeof matches !== 'object') {
      return { weightClass: name || 'Unknown', participantCount: count || 0, bouts: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bouts: FloBout[] = Object.values(matches).map((m: any) => ({
      id: m.id,
      matchNumber: m.matchNumber || null,
      result: m.result || null,
      roundName: m.roundName || null,
      state: m.state || 'unknown',
      placement: m.placement || null,
      winType: m.winType || null,
      topParticipant: m.topParticipant
        ? {
            id: m.topParticipant.id,
            winner: m.topParticipant.winner || false,
            displayName: m.topParticipant.displayName || '',
            displayTeamName: m.topParticipant.displayTeamName || '',
            teamName: m.topParticipant.teamName || '',
            name: m.topParticipant.name || '',
            team: m.topParticipant.team || '',
            seed: m.topParticipant.seed || 0,
            score: m.topParticipant.score || 0,
            highlightColor: m.topParticipant.highlightColor || '',
          }
        : null,
      bottomParticipant: m.bottomParticipant
        ? {
            id: m.bottomParticipant.id,
            winner: m.bottomParticipant.winner || false,
            displayName: m.bottomParticipant.displayName || '',
            displayTeamName: m.bottomParticipant.displayTeamName || '',
            teamName: m.bottomParticipant.teamName || '',
            name: m.bottomParticipant.name || '',
            team: m.bottomParticipant.team || '',
            seed: m.bottomParticipant.seed || 0,
            score: m.bottomParticipant.score || 0,
            highlightColor: m.bottomParticipant.highlightColor || '',
          }
        : null,
      winnerToTop: m.winnerToTop || false,
      loserToTop: m.loserToTop || false,
      boutVideoUrl: m.boutVideoUrl || null,
      x: m.x ?? 0,
      y: m.y ?? 0,
    }));

    const realBouts = bouts.filter((b) => b.state !== 'bye');

    return {
      weightClass: name || 'Unknown',
      participantCount: count || 0,
      bouts: realBouts,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout fetching bouts for bracket ${bracketId} in event ${floEventId}`);
    }
    throw error;
  }
}

export async function getBracketPlacements(
  floEventId: string,
  bracketId: string
): Promise<FloPlacement[]> {
  const url = `${FLO_API_BASE}/${floEventId}/brackets/placements/${bracketId}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await floFetch<any>(url);

    if (!json.data || !Array.isArray(json.data)) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return json.data.map((p: any) => ({
      place: p.place || '',
      participantId: p.participantId || '',
      name: p.name || '',
      teamName: p.teamName || '',
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout fetching placements for bracket ${bracketId}`);
    }
    throw error;
  }
}

export async function getFullEventData(floEventId: string): Promise<FloFullEventData> {
  const errors: string[] = [];

  let event: FloEventInfo;
  try {
    event = await getEventInfo(floEventId);
  } catch (err) {
    throw new Error(`Failed to fetch event info for ${floEventId}: ${err instanceof Error ? err.message : String(err)}`);
  }

  let divisions: FloBracketOption[];
  try {
    divisions = await getBracketDivisions(floEventId);
  } catch (err) {
    throw new Error(`Failed to fetch divisions for ${floEventId}: ${err instanceof Error ? err.message : String(err)}`);
  }

  const activeDivisions = divisions.filter((d) => !d.isDisabled);

  if (activeDivisions.length === 0) {
    return { event, brackets: [], errors: ['No active bracket divisions found'] };
  }

  const brackets: FloBracketData[] = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < activeDivisions.length; i += BATCH_SIZE) {
    const batch = activeDivisions.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (div) => {
        const [boutsResult, placementsResult] = await Promise.allSettled([
          getBracketBouts(floEventId, div.bracketId),
          getBracketPlacements(floEventId, div.bracketId),
        ]);

        const bouts =
          boutsResult.status === 'fulfilled'
            ? boutsResult.value
            : { weightClass: div.weightClass, participantCount: 0, bouts: [] as FloBout[] };

        if (boutsResult.status === 'rejected') {
          errors.push(`Failed to fetch bouts for ${div.weightClass}: ${boutsResult.reason}`);
        }

        const placements =
          placementsResult.status === 'fulfilled' ? placementsResult.value : ([] as FloPlacement[]);

        if (placementsResult.status === 'rejected') {
          errors.push(`Failed to fetch placements for ${div.weightClass}: ${placementsResult.reason}`);
        }

        return {
          weightClass: bouts.weightClass,
          participantCount: bouts.participantCount,
          bouts: bouts.bouts,
          placements,
        };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        brackets.push(r.value);
      } else {
        errors.push(`Bracket batch fetch failed: ${r.reason}`);
      }
    }

    if (i + BATCH_SIZE < activeDivisions.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return { event, brackets, errors };
}

// ============================================================
// TW → FLO EVENT ID AUTO-MATCHING
// ============================================================

export async function findFloEventIdByName(
  eventName: string,
  searchRange: { start: number; end: number }
): Promise<string | null> {
  const normalizedTarget = normalizeEventName(eventName);

  for (let id = searchRange.start; id <= searchRange.end; id++) {
    try {
      const info = await getEventInfo(String(id));
      const normalizedFlo = normalizeEventName(info.title);

      if (normalizedTarget === normalizedFlo) {
        return String(id);
      }

      if (normalizedTarget.includes(normalizedFlo) || normalizedFlo.includes(normalizedTarget)) {
        return String(id);
      }
    } catch {
      // Skip — this Flo ID doesn't exist or timed out
    }

    await delay(RATE_LIMIT_DELAY_MS);
  }

  return null;
}

export async function findFloEventIdsBatch(
  events: Array<{ name: string; startDate: string }>,
  hintFloId?: number
): Promise<Map<string, string>> {
  const centerId = hintFloId || 14468740;
  const SCAN_RADIUS = 75;
  const start = centerId - SCAN_RADIUS;
  const end = centerId + SCAN_RADIUS;
  const PARALLEL_BATCH = 10;

  const floCache = new Map<number, { title: string; startDate: string }>();

  for (let i = start; i <= end; i += PARALLEL_BATCH) {
    const batchIds = Array.from({ length: Math.min(PARALLEL_BATCH, end - i + 1) }, (_, idx) => i + idx);

    const results = await Promise.allSettled(
      batchIds.map(async (id) => {
        const info = await getEventInfo(String(id));
        return { id, title: info.title, startDate: info.startDate };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        floCache.set(r.value.id, { title: r.value.title, startDate: r.value.startDate });
      }
    }

    await delay(BATCH_DELAY_MS);
  }

  const matchMap = new Map<string, string>();

  for (const twEvent of events) {
    const normalizedTw = normalizeEventName(twEvent.name);
    let bestMatch: { floId: number; score: number } | null = null;

    for (const [floId, floData] of floCache.entries()) {
      const normalizedFlo = normalizeEventName(floData.title);

      if (normalizedTw === normalizedFlo) {
        bestMatch = { floId, score: 100 };
        break;
      }

      if (normalizedTw.includes(normalizedFlo) || normalizedFlo.includes(normalizedTw)) {
        if (!bestMatch || bestMatch.score < 90) {
          bestMatch = { floId, score: 90 };
        }
        continue;
      }

      const twDate = twEvent.startDate.split('T')[0];
      const floDate = floData.startDate.split('T')[0];
      if (twDate === floDate) {
        const sharedWords = extractSharedWords(twEvent.name, floData.title);
        if (sharedWords >= 3) {
          const score = 50 + sharedWords * 5;
          if (!bestMatch || bestMatch.score < score) {
            bestMatch = { floId, score };
          }
        }
      }
    }

    if (bestMatch && bestMatch.score >= 50) {
      matchMap.set(twEvent.name, String(bestMatch.floId));
    }
  }

  return matchMap;
}
