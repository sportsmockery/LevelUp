export const BASE = "/pafa" as const;

export const SITE = {
  name: "Palatine Panthers",
  shortName: "PAFA",
  domain: "palatinepanthers.com",
} as const;

export const PRIMARY_NAV = [
  { label: "About", href: `${BASE}/about` },
  { label: "Programs", href: `${BASE}/programs` },
  { label: "Teams", href: `${BASE}/teams` },
  { label: "Schedule", href: `${BASE}/schedule` },
  { label: "News", href: `${BASE}/news` },
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
