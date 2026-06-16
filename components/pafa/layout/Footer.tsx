import Link from "next/link";
import { PROGRAM_SLUGS, PRIMARY_NAV, SITE, UTILITY_NAV, BASE } from "@/lib/pafa/constants";

export default function Footer() {
  return (
    <footer className="glass-panel-subtle mt-16 border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div
                data-image-slot="logo"
                aria-hidden="true"
                className="h-10 w-10 rounded-md border border-border-subtle bg-bg-elevated"
              />
              <span className="text-display text-xl">{SITE.name}</span>
            </div>
            <p className="text-sm text-text-secondary">
              {/* COPY: footer tagline */}
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-sans text-sm font-semibold text-text-primary">
              Programs
            </h3>
            <ul className="space-y-2">
              {PROGRAM_SLUGS.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`${BASE}/programs/${slug}`}
                    className="text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                  >
                    {/* COPY: program name */}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-sans text-sm font-semibold text-text-primary">
              Resources
            </h3>
            <ul className="space-y-2">
              {[...UTILITY_NAV, ...PRIMARY_NAV.filter((n) => n.label === "Schedule")].map(
                (item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-sans text-sm font-semibold text-text-primary">
              Connect
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href={`${BASE}/contact`}
                  className="text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href={`${BASE}/register`}
                  className="text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                >
                  Register
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-border-subtle pt-6 sm:flex-row">
          <p className="text-xs text-text-muted">
            © 2026 Palatine Amateur Football Association
          </p>
          <p className="text-xs text-text-muted">Powered by XpairkOS</p>
        </div>
      </div>
    </footer>
  );
}
