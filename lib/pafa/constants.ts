export const BASE = "/pafa" as const;

export const SITE = {
  name: "Palatine Panthers",
  legalName: "Palatine Amateur Football Association",
  shortName: "PAFA",
  domain: "palatinepanthers.com",
  url: "https://www.palatinepanthers.com",
  founded: 1966,
  tagline: "Welcome to the Den.",
  // NOTE (assumption): contact details below are realistic placeholders for the
  // Palatine Panthers / PAFA. Confirm and replace with verified info before launch.
  email: "info@palatinepanthers.com",
  phone: "(847) 555-0166",
  venue: {
    name: "Ost Field",
    street: "Ost Rd & N Plum Grove Rd",
    city: "Palatine",
    region: "IL",
    postalCode: "60067",
    // Approx. coordinates for Palatine, IL — refine if exact field coords are known.
    lat: 42.1103,
    lng: -88.0342,
    mapsQuery: "Ost+Field+Palatine+IL",
  },
  affiliation: {
    name: "Bill George Youth Football League",
    short: "BGYFL",
  },
} as const;

export const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/palatinepanthers", icon: "facebook" },
  { label: "Instagram", href: "https://www.instagram.com/palatinepanthers", icon: "instagram" },
  { label: "YouTube", href: "https://www.youtube.com/@palatinepanthers", icon: "youtube" },
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
    season: "Practices begin Aug 1 · Games Sept–Nov",
    price: "From $295",
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
    season: "Saturdays · Sept–Oct",
    price: "From $150",
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
    grades: "Grades K–8",
    ages: "Ages 5–14",
    tagline: "Heart of the sideline.",
    blurb:
      "Spirit, stunting, and showmanship. Panther cheer builds strength, rhythm, and unstoppable confidence — cheering on our teams under the lights and competing at BGYFL showcases.",
    season: "Practices begin Aug · Performs Sept–Nov",
    price: "From $225",
    benefits: [
      "Sideline & competition routines",
      "Strength, dance & teamwork",
      "Performs at every home game",
    ],
  },
  {
    slug: "summer-camp",
    name: "Summer Camp",
    icon: "sun",
    accent: "blue",
    grades: "Grades K–8",
    ages: "Ages 5–14",
    tagline: "Get a head start at the Den.",
    blurb:
      "A week of skills, speed, agility, and fun at Ost Field before the season kicks off. Meet your coaches, make new teammates, and walk in on day one ready to compete.",
    season: "July 13–16, 2026 · 9am–12pm",
    price: "From $120",
    benefits: [
      "Position & agility training",
      "Meet your coaches early",
      "All skill levels welcome",
    ],
  },
];

export interface UpcomingGame {
  id: string;
  opponent: string;
  /** Whether the Panthers are hosting */
  home: boolean;
  /** ISO 8601 with timezone */
  start: string;
  end: string;
  venueName: string;
  venueAddress: string;
  mapsQuery: string;
  note?: string;
}

// Fall 2026 BGYFL slate (illustrative — replace with the official schedule).
export const UPCOMING_GAMES: UpcomingGame[] = [
  {
    id: "pafa-2026-09-12",
    opponent: "Schaumburg Chargers",
    home: true,
    start: "2026-09-12T18:30:00-05:00",
    end: "2026-09-12T20:30:00-05:00",
    venueName: "Ost Field",
    venueAddress: "Ost Rd & N Plum Grove Rd, Palatine, IL 60067",
    mapsQuery: "Ost+Field+Palatine+IL",
    note: "Home Opener · Under the Lights",
  },
  {
    id: "pafa-2026-09-19",
    opponent: "Arlington Cardinals",
    home: false,
    start: "2026-09-19T13:00:00-05:00",
    end: "2026-09-19T15:00:00-05:00",
    venueName: "Recreation Park",
    venueAddress: "500 E Miner St, Arlington Heights, IL 60004",
    mapsQuery: "Recreation+Park+Arlington+Heights+IL",
  },
  {
    id: "pafa-2026-09-26",
    opponent: "Hoffman Estates Hawks",
    home: true,
    start: "2026-09-26T18:30:00-05:00",
    end: "2026-09-26T20:30:00-05:00",
    venueName: "Ost Field",
    venueAddress: "Ost Rd & N Plum Grove Rd, Palatine, IL 60067",
    mapsQuery: "Ost+Field+Palatine+IL",
    note: "Panther Pride Night",
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

/** Key dates surfaced in the UI for urgency/trust. */
export const KEY_DATES = {
  earlyBirdDeadline: "July 15, 2026",
  seasonKickoff: "September 12, 2026",
  campWeek: "July 13–16, 2026",
} as const;
