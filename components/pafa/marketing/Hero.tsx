import Link from "next/link";
import { ChevronDown, PlayCircle, ShieldCheck } from "lucide-react";
import Badge from "@/components/pafa/ui/Badge";
import Button from "@/components/pafa/ui/Button";
import { BASE, SITE, KEY_DATES } from "@/lib/pafa/constants";

/**
 * Above-the-fold hero. The LCP element is the headline + hero poster.
 *
 * Performance notes:
 * - The poster (<img>) ships with width/height + aspect-ratio to reserve space
 *   (zero CLS) and fetchpriority="high" + loading="eager" so it is requested
 *   immediately. It is also <link rel="preload"> in the page <head> (see
 *   app/pafa/(marketing)/page.tsx metadata / generateMetadata note).
 * - The committed SVG poster keeps LCP tiny and asset-free. When real photos are
 *   produced (see the image-generation prompts in the PR description), upgrade to
 *   the commented <picture> below by dropping AVIF/WebP files into
 *   /public/pafa/media and uncommenting the <source> elements.
 */
export default function Hero() {
  return (
    <section
      className="bg-field-hero relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="bg-grid-overlay" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pt-16 pb-24 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-24">
        {/* Copy column */}
        <div className="flex flex-col items-start gap-6 text-left">
          <Badge variant="gold" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-brand-gold" aria-hidden="true" />
            Panther Pride since {SITE.founded} · Palatine, IL
          </Badge>

          <h1
            id="hero-heading"
            className="text-display text-5xl leading-[0.92] sm:text-6xl md:text-7xl"
          >
            Welcome to
            <br />
            <span className="text-gradient-gold">the Den.</span>
          </h1>

          <p className="max-w-xl text-lg text-text-secondary">
            Youth tackle &amp; flag football, cheer, and summer camp for Palatine
            kids in grades K–8. Safe coaching, real friendships, and Friday night
            lights at Ost Field — the way it&apos;s been done here for over 50 years.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" size="lg" asChild>
              <Link href={`${BASE}/register`}>Join the Pride →</Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <a href="#highlights" className="gap-2">
                <PlayCircle className="size-5" aria-hidden="true" />
                Watch Highlights
              </a>
            </Button>
          </div>

          {/* Trust signals */}
          <dl className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <ShieldCheck className="size-4 text-status-success" aria-hidden="true" />
              <span>USA Football <strong className="font-semibold text-text-primary">Heads Up</strong> certified</span>
            </div>
            <div>
              <dt className="sr-only">Years serving Palatine</dt>
              <dd className="text-text-secondary">
                <strong className="text-display text-xl text-brand-gold">50+</strong>{" "}
                years in the community
              </dd>
            </div>
            <div>
              <dt className="sr-only">League</dt>
              <dd className="text-text-secondary">
                Proud member of the{" "}
                <strong className="font-semibold text-text-primary">{SITE.affiliation.short}</strong>
              </dd>
            </div>
          </dl>

          <p className="text-sm text-brand-gold-bright">
            🏈 2026 practice begins {KEY_DATES.practiceBegins} at Ost Field — spots are
            limited. Reach out to join the waitlist.
          </p>
        </div>

        {/* Media column — LCP image */}
        <div className="relative">
          <div className="glass-panel-strong glass-glow-gold overflow-hidden rounded-2xl">
            <picture>
              {/* Upgrade path — produce these with the prompts in the PR notes,
                  drop them in /public/pafa/media, then uncomment:
              <source
                type="image/avif"
                srcSet="/pafa/media/hero-640.avif 640w, /pafa/media/hero-1024.avif 1024w, /pafa/media/hero-1600.avif 1600w"
                sizes="(min-width: 1024px) 48vw, 100vw"
              />
              <source
                type="image/webp"
                srcSet="/pafa/media/hero-640.webp 640w, /pafa/media/hero-1024.webp 1024w, /pafa/media/hero-1600.webp 1600w"
                sizes="(min-width: 1024px) 48vw, 100vw"
              /> */}
              <img
                src="/pafa/media/hero-poster.svg"
                alt="Palatine Panthers players and cheerleaders under the Friday night lights at Ost Field"
                width={1600}
                height={900}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="h-auto w-full"
                style={{ aspectRatio: "16 / 9" }}
              />
            </picture>
          </div>

          {/* Floating proof chip */}
          <div className="glass-panel-strong absolute -bottom-4 -left-2 hidden items-center gap-3 rounded-xl px-4 py-3 sm:flex">
            <span className="text-display text-3xl text-brand-gold">1966</span>
            <span className="text-xs leading-tight text-text-secondary">
              Generations of
              <br />
              Palatine Panthers
            </span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#why-pafa"
        aria-label="Scroll to learn why families choose PAFA"
        className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 md:flex"
      >
        <span className="text-[11px] tracking-widest uppercase">Explore</span>
        <ChevronDown className="scroll-hint size-5" aria-hidden="true" />
      </a>
    </section>
  );
}
