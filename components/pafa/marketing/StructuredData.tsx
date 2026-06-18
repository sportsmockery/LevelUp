import { SITE, SOCIALS, SEASON_EVENTS } from "@/lib/pafa/constants";

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
    telephone: SITE.contacts[0]?.phone,
    contactPoint: SITE.contacts.map((c) => ({
      "@type": "ContactPoint",
      name: c.name,
      contactType: c.role,
      telephone: c.phone,
    })),
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

  const events = SEASON_EVENTS.map((e) => ({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `Palatine Panthers — ${e.title}`,
    startDate: e.start,
    endDate: e.end,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: e.locationName,
      ...(e.locationAddress ? { address: e.locationAddress } : {}),
    },
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
