export const BASE = "/pafa" as const;

export const SITE = {
  name: "Palatine Panthers",
  legalName: "Palatine Amateur Football Association",
  shortName: "PAFA",
  domain: "palatinepanthers.com",
  url: "https://www.palatinepanthers.com",
  founded: 1966,
  tagline: "Welcome to the Den.",
  email: "pafa@palatinepanthers.com",
  mailingAddress: "250 E. Wood Street, Palatine, IL 60067",
  // PAFA has no general phone line — these are the published board contacts.
  contacts: [
    { name: "Rick Zapata", role: "President", phone: "847-348-8331" },
    { name: "Shane Jones", role: "Vice President", phone: "773-383-2427" },
  ],
  venue: {
    name: "Ost Field",
    street: "250 E Wood St",
    city: "Palatine",
    region: "IL",
    postalCode: "60067",
    // NOTE: approximate, Palatine-area coordinates — verify the exact field pin
    // in Google Maps before launch. (The researched 41.679 value plots ~30mi SW.)
    lat: 42.112,
    lng: -88.03,
    mapsQuery: "Ost+Field+250+E+Wood+St+Palatine+IL+60067",
  },
  affiliation: {
    name: "Bill George Youth Football League",
    short: "BGYFL",
  },
} as const;

export const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/PAFAfootball", icon: "facebook" },
  { label: "Instagram", href: "https://www.instagram.com/pafafootball", icon: "instagram" },
] as const;

export const PRIMARY_NAV = [
  { label: "Programs", href: `${BASE}/programs` },
  { label: "Schedule", href: `${BASE}/schedule` },
  { label: "News", href: `${BASE}/news` },
  { label: "About", href: `${BASE}/about` },
  { label: "Sponsors", href: `${BASE}/sponsors` },
  { label: "Contact", href: `${BASE}/contact` },
] as const;

export const UTILITY_NAV = [
  { label: "Store", href: `${BASE}/store` },
  { label: "Donate", href: `${BASE}/donate` },
  { label: "Volunteer", href: `${BASE}/volunteer` },
  { label: "FAQ", href: `${BASE}/faq` },
] as const;

export const PROGRAM_SLUGS = [
  "tackle-football",
  "flag-football",
  "cheerleading",
  "summer-camp",
] as const;

export type ProgramSlug = (typeof PROGRAM_SLUGS)[number];

export interface Program {
  slug: ProgramSlug;
  name: string;
  /** Lucide icon key, mapped in the UI layer */
  icon: "shield" | "flag" | "sparkles" | "sun";
  accent: "gold" | "blue";
  grades: string;
  ages: string;
  tagline: string;
  blurb: string;
  season: string;
  price: string;
  benefits: string[];
}

export const PROGRAMS: Program[] = [
  {
    slug: "tackle-football",
    name: "Tackle Football",
    icon: "shield",
    accent: "gold",
    grades: "Grades 3–8",
    ages: "Ages 8–14",
    tagline: "Friday night lights start here.",
    blurb:
      "Full-contact, age- and weight-bracketed teams competing in the Bill George Youth Football League. USA Football Heads Up certified coaches teach proper technique first — so the game is safer and the fundamentals last a lifetime.",
    season: "Practice begins Jul 30 · Games Aug 29–Nov",
    price: "From $565",
    benefits: [
      "Heads Up tackle certification",
      "Weight-bracketed for fair, safe play",
      "BGYFL playoff & championship path",
    ],
  },
  {
    slug: "flag-football",
    name: "Flag Football",
    icon: "flag",
    accent: "blue",
    grades: "Grades K–2",
    ages: "Ages 5–7",
    tagline: "Where the love of the game begins.",
    blurb:
      "Non-contact, fast, and fun. Our littlest Panthers learn the basics — catching, running, teamwork, and good sportsmanship — in a high-energy environment built entirely around confidence and joy.",
    season: "Fall season at Ost Field",
    price: "See registration",
    benefits: [
      "No contact — pure fundamentals & fun",
      "Every player plays every game",
      "Perfect first-sport experience",
    ],
  },
  {
    slug: "cheerleading",
    name: "Cheerleading",
    icon: "sparkles",
    accent: "gold",
    grades: "All ages welcome",
    ages: "Sideline & spirit",
    tagline: "Heart of the sideline.",
    blurb:
      "Spirit, stunting, and showmanship. Panther cheer builds strength, rhythm, and unstoppable confidence — cheering on our teams under the lights at Ost Field.",
    season: "Performs every home game",
    price: "See registration",
    benefits: [
      "Sideline routines & game-day spirit",
      "Strength, dance & teamwork",
      "Cheers on every Panther squad",
    ],
  },
  {
    slug: "summer-camp",
    name: "Summer Camp",
    icon: "sun",
    accent: "blue",
    grades: "8U–Varsity",
    ages: "Ages 7–14",
    tagline: "Get a head start at the Den.",
    blurb:
      "Skills, speed, agility, and fun at Ost Field before the season kicks off. Meet your coaches, make new teammates, and walk in on day one ready to compete.",
    season: "July 13–16, 2026 · 5:30–7:00pm",
    price: "See registration",
    benefits: [
      "Position & agility training",
      "Meet your coaches early",
      "All skill levels welcome",
    ],
  },
];

export interface SeasonEvent {
  id: string;
  title: string;
  category: "Football" | "Camp" | "Team" | "Community";
  /** ISO 8601 with timezone */
  start: string;
  end: string;
  locationName: string;
  /** Present when the venue is a mappable address. */
  locationAddress?: string;
  mapsQuery?: string;
  note?: string;
}

// Confirmed 2026 key dates from the PAFA events page. The 9-game BGYFL slate
// (Week 1 kicks off Aug 29) is not yet published — swap in opponent matchups
// here once it is released.
export const OST_FIELD_ADDRESS = "250 E Wood St, Palatine, IL 60067";
const OST_MAPS = "Ost+Field+250+E+Wood+St+Palatine+IL+60067";

export const SEASON_EVENTS: SeasonEvent[] = [
  {
    id: "pafa-2026-06-27-equip",
    title: "Equipment Pickup #1",
    category: "Team",
    start: "2026-06-27T08:30:00-05:00",
    end: "2026-06-27T12:00:00-05:00",
    locationName: "Ost Field",
    locationAddress: OST_FIELD_ADDRESS,
    mapsQuery: OST_MAPS,
    note: "Gear up for 2026",
  },
  {
    id: "pafa-2026-07-13-camp",
    title: "Summer Camp Begins",
    category: "Camp",
    start: "2026-07-13T17:30:00-05:00",
    end: "2026-07-13T19:00:00-05:00",
    locationName: "Ost Field",
    locationAddress: OST_FIELD_ADDRESS,
    mapsQuery: OST_MAPS,
    note: "8U / 9U / 10U · July 13–16",
  },
  {
    id: "pafa-2026-07-20-equip",
    title: "Final Equipment Pickup",
    category: "Team",
    start: "2026-07-20T18:00:00-05:00",
    end: "2026-07-20T20:00:00-05:00",
    locationName: "Ost Field",
    locationAddress: OST_FIELD_ADDRESS,
    mapsQuery: OST_MAPS,
  },
  {
    id: "pafa-2026-07-30-practice",
    title: "First Practice",
    category: "Football",
    start: "2026-07-30T18:00:00-05:00",
    end: "2026-07-30T20:00:00-05:00",
    locationName: "Ost Field",
    locationAddress: OST_FIELD_ADDRESS,
    mapsQuery: OST_MAPS,
    note: "The 2026 season starts here",
  },
  {
    id: "pafa-2026-08-21-jamboree",
    title: "Panther Jamboree",
    category: "Football",
    start: "2026-08-21T18:00:00-05:00",
    end: "2026-08-21T19:00:00-05:00",
    locationName: "Ost Field",
    locationAddress: OST_FIELD_ADDRESS,
    mapsQuery: OST_MAPS,
    note: "Preseason showcase under the lights",
  },
  {
    id: "pafa-2026-08-29-week1",
    title: "Season Week 1",
    category: "Football",
    start: "2026-08-29T08:00:00-05:00",
    end: "2026-08-29T19:00:00-05:00",
    locationName: "Matchups & times TBD",
    note: "BGYFL regular season kickoff",
  },
];

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "My son joined as a shy second grader who'd never played a sport. Two seasons later he's the loudest kid on the sideline, cheering on his teammates. PAFA didn't just teach him football — it gave him a family.",
    name: "Jen R.",
    role: "Mom of a 4th-grade Panther",
  },
  {
    quote:
      "The coaches genuinely care about safety. Heads Up tackling, real water breaks, no shortcuts. As a nurse and a mom, that's everything to me.",
    name: "Maria S.",
    role: "Parent · Flag & Tackle",
  },
  {
    quote:
      "We moved to Palatine in 2023 and didn't know a soul. Friday nights at Ost Field changed that. Our whole family found our people here.",
    name: "Dave & Kelly M.",
    role: "Panther parents since 2023",
  },
  {
    quote:
      "Cheer gave my daughter confidence I didn't know she had. She walks taller now. The bond on that squad is something special.",
    name: "Tanya W.",
    role: "Cheer mom · Grade 6",
  },
  {
    quote:
      "I played for the Panthers in the '90s. Watching my own kid run out under the same lights at Ost Field — there's nothing like it. Legacy is real here.",
    name: "Mike D.",
    role: "Alum & coach",
  },
  {
    quote:
      "Registration was easy, the portal keeps everything in one place, and the coaches actually communicate. As a busy working parent, that matters.",
    name: "Priya K.",
    role: "Mom of two Panthers",
  },
];

export interface PortalFeature {
  icon: "calendar" | "wallet" | "fileText" | "bell";
  title: string;
  desc: string;
}

export const PORTAL_FEATURES: PortalFeature[] = [
  { icon: "calendar", title: "Schedules", desc: "Practices & games in one place" },
  { icon: "wallet", title: "Balances", desc: "Pay & track fees securely" },
  { icon: "fileText", title: "Documents", desc: "Forms, waivers & rosters" },
  { icon: "bell", title: "Real-time alerts", desc: "Weather & schedule changes" },
];

export const PORTAL_NAV = [
  { label: "Dashboard", href: `${BASE}/dashboard` },
  { label: "Family", href: `${BASE}/family` },
  { label: "Messages", href: `${BASE}/messages` },
  { label: "Documents", href: `${BASE}/documents` },
] as const;

export const ADMIN_NAV = [
  { label: "Overview", href: `${BASE}/clear` },
  { label: "Registrations", href: `${BASE}/clear/registrations` },
  { label: "Financials", href: `${BASE}/clear/financials` },
  { label: "Sponsors", href: `${BASE}/clear/sponsors` },
  { label: "Volunteers", href: `${BASE}/clear/volunteers` },
  { label: "Compliance", href: `${BASE}/clear/compliance` },
  { label: "Settings", href: `${BASE}/clear/settings` },
] as const;

/** Confirmed 2026 key dates surfaced in the UI for urgency/trust. */
export const KEY_DATES = {
  balanceDue: "June 19, 2026",
  campWeek: "July 13–16, 2026",
  practiceBegins: "July 30, 2026",
  jamboree: "August 21, 2026",
  seasonKickoff: "August 29, 2026",
} as const;
