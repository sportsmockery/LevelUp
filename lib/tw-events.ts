// /levelup/lib/tw-events.ts
// TrackWrestling Illinois events scraper — public HTML, no auth required

import * as cheerio from 'cheerio';

const TW_BASE_URL = 'https://www.trackwrestling.com/Login.jsp';
const TW_TIMEOUT_MS = 15000;

export type TwEvent = {
  twTournamentId: string;
  name: string;
  dateRange: string;
  startDate: string;
  endDate: string | null;
  venueName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function parseDateRange(dateRange: string): { startDate: string; endDate: string | null } {
  const trimmed = dateRange.trim();

  // Format: "02/13 - 02/14/2026" (multi-day)
  const multiDayMatch = trimmed.match(
    /(\d{2})\/(\d{2})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/
  );
  if (multiDayMatch) {
    const [, startMonth, startDay, endMonth, endDay, year] = multiDayMatch;
    return {
      startDate: `${year}-${startMonth}-${startDay}`,
      endDate: `${year}-${endMonth}-${endDay}`,
    };
  }

  // Format: "02/13/2026" (single day)
  const singleDayMatch = trimmed.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (singleDayMatch) {
    const [, month, day, year] = singleDayMatch;
    return {
      startDate: `${year}-${month}-${day}`,
      endDate: null,
    };
  }

  console.warn(`[TW Scraper] Could not parse date range: "${trimmed}"`);
  return { startDate: trimmed, endDate: null };
}

function parseVenueBlock(html: string): {
  venueName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  const parts = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const venueName = parts[0] || '';
  const street = parts[1] || '';
  let city = '';
  let state = '';
  let zip = '';

  if (parts[2]) {
    const cityStateZip = parts[2];
    const commaIdx = cityStateZip.lastIndexOf(',');
    if (commaIdx > -1) {
      city = cityStateZip.substring(0, commaIdx).trim();
      const stateZip = cityStateZip.substring(commaIdx + 1).trim();
      const stateZipParts = stateZip.split(/\s+/);
      state = stateZipParts[0] || '';
      zip = stateZipParts[1] || '';
    } else {
      city = cityStateZip;
    }
  }

  return { venueName, street, city, state, zip };
}

export async function scrapeIllinoisEvents(
  pageIndex: number = 0
): Promise<{ events: TwEvent[]; totalCount: number }> {
  const tournamentIndex = pageIndex * 30;
  const url = `${TW_BASE_URL}?tName=&state=16&sDate=&eDate=&lastName=&firstName=&teamName=&sfvString=&city=&gbId=&camps=false${
    tournamentIndex > 0 ? `&tournamentIndex=${tournamentIndex}` : ''
  }`;

  let html: string;

  try {
    const response = await fetch(url, {
      signal: createTimeoutSignal(TW_TIMEOUT_MS),
      headers: {
        'User-Agent': 'LevelUp-Wrestling/1.0',
        Accept: 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`TW returned status ${response.status}`);
    }

    html = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[TW Scraper] Timeout fetching page ${pageIndex}`);
      return { events: [], totalCount: 0 };
    }
    console.error(`[TW Scraper] Fetch error page ${pageIndex}:`, error);
    return { events: [], totalCount: 0 };
  }

  try {
    const $ = cheerio.load(html);

    let totalCount = 0;
    const paginationText = $('.dataGridNextPrev span').first().text();
    const totalMatch = paginationText.match(/of\s+(\d[\d,]*)/);
    if (totalMatch) {
      totalCount = parseInt(totalMatch[1].replace(/,/g, ''), 10);
    }

    const events: TwEvent[] = [];

    $('ul.tournament-ul li').each((_, li) => {
      try {
        const $li = $(li);
        const divs = $li.children('div');

        const anchorHref = $li.find('a[href*="eventSelected"]').first().attr('href') || '';
        const idMatch = anchorHref.match(/eventSelected\((\d+)/);
        if (!idMatch) return;

        const twTournamentId = idMatch[1];

        const secondDiv = $(divs[1]);
        const nameSpan = secondDiv.find('span').first();
        const name = nameSpan.text().trim();
        if (!name) return;

        const dateSpan = secondDiv.find('span').eq(1);
        const dateRange = dateSpan.text().trim();
        const { startDate, endDate } = parseDateRange(dateRange);

        const thirdDiv = $(divs[2]);
        const venueSpan = thirdDiv.find('td span').first();
        const venueHtml = venueSpan.html() || '';
        const { venueName, street, city, state, zip } = parseVenueBlock(venueHtml);

        events.push({
          twTournamentId,
          name,
          dateRange,
          startDate,
          endDate,
          venueName,
          street,
          city,
          state: state || 'IL',
          zip,
        });
      } catch (err) {
        console.warn('[TW Scraper] Error parsing event row:', err);
      }
    });

    return { events, totalCount };
  } catch (error) {
    console.error(`[TW Scraper] Parse error page ${pageIndex}:`, error);
    return { events: [], totalCount: 0 };
  }
}
