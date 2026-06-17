import { SITE, SOCIALS, UPCOMING_GAMES } from "@/lib/pafa/constants";

/**
 * JSON-LD structured data: SportsOrganization (with SportsTeam semantics) plus
 * the upcoming game Events. Helps Google surface the org, location, and schedule.
 */
export default function StructuredData() {
  const venue = SITE.venue;

  const organization = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: SITE.name,
    legalName: SITE.legalName,
    alternateName: SITE.shortName,
    sport: "American Football",
    foundingDate: String(SITE.founded),
    url: SITE.url,
    email: SITE.email,
    telephone: SITE.phone,
    memberOf: { "@type": "SportsOrganization", name: SITE.affiliation.name },
    sameAs: SOCIALS.map((s) => s.href),
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.street,
      addressLocality: venue.city,
      addressRegion: venue.region,
      postalCode: venue.postalCode,
      addressCountry: "US",
    },
    location: {
      "@type": "Place",
      name: venue.name,
      geo: { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng },
    },
  };

  const events = UPCOMING_GAMES.map((g) => ({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `Palatine Panthers ${g.home ? "vs" : "@"} ${g.opponent}`,
    startDate: g.start,
    endDate: g.end,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: g.venueName,
      address: g.venueAddress,
    },
    homeTeam: { "@type": "SportsTeam", name: g.home ? SITE.name : g.opponent },
    awayTeam: { "@type": "SportsTeam", name: g.home ? g.opponent : SITE.name },
    organizer: { "@type": "SportsOrganization", name: SITE.name, url: SITE.url },
  }));

  const graph = [organization, ...events];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
