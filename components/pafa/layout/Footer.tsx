import Link from "next/link";
import { Facebook, Instagram, Youtube, MapPin, Mail, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  PROGRAMS,
  PRIMARY_NAV,
  UTILITY_NAV,
  SITE,
  SOCIALS,
  BASE,
} from "@/lib/pafa/constants";
import NewsletterForm from "@/components/pafa/layout/NewsletterForm";

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
};

export default function Footer() {
  return (
    <footer className="glass-panel-subtle mt-16 border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          {/* Brand + contact */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-brand-gold text-display text-xl text-brand-black">
                P
              </span>
              <span className="text-display text-xl">{SITE.name}</span>
            </div>
            <p className="mb-5 max-w-xs text-sm text-text-secondary">
              Building champions on and off the field in Palatine, IL since {SITE.founded}.
              Welcome to the Den.
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-gold" aria-hidden="true" />
                <span>
                  {SITE.venue.name}, {SITE.venue.street}
                  <br />
                  {SITE.venue.city}, {SITE.venue.region} {SITE.venue.postalCode}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-brand-gold" aria-hidden="true" />
                <a href={`mailto:${SITE.email}`} className="hover:text-text-primary">
                  {SITE.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-brand-gold" aria-hidden="true" />
                <a href={`tel:${SITE.phone.replace(/[^\d+]/g, "")}`} className="hover:text-text-primary">
                  {SITE.phone}
                </a>
              </li>
            </ul>
          </div>

          {/* Programs */}
          <div>
            <h3 className="mb-4 font-sans text-sm font-semibold text-text-primary">
              Programs
            </h3>
            <ul className="space-y-2">
              {PROGRAMS.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`${BASE}/programs/${p.slug}`}
                    className="text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore + resources */}
          <div>
            <h3 className="mb-4 font-sans text-sm font-semibold text-text-primary">
              Explore
            </h3>
            <ul className="space-y-2">
              {[...PRIMARY_NAV, ...UTILITY_NAV].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter + social */}
          <div>
            <h3 className="mb-4 font-sans text-sm font-semibold text-text-primary">
              Panther News
            </h3>
            <p className="mb-3 text-sm text-text-secondary">
              Game updates, registration reminders, and Den news.
            </p>
            <NewsletterForm />

            <div className="mt-6 flex items-center gap-3">
              {SOCIALS.map((s) => {
                const Icon = SOCIAL_ICONS[s.icon];
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${SITE.name} on ${s.label}`}
                    className="flex size-10 items-center justify-center rounded-md border border-border-default text-text-secondary transition-colors hover:border-brand-gold/40 hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-border-subtle pt-6 sm:flex-row">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} {SITE.legalName}. All rights reserved.
          </p>
          <p className="text-xs text-text-muted">
            A proud member of the {SITE.affiliation.name} ({SITE.affiliation.short}).
          </p>
        </div>
      </div>
    </footer>
  );
}
