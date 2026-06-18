import { Facebook, Instagram, Film } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Button from "@/components/pafa/ui/Button";
import { SOCIALS } from "@/lib/pafa/constants";

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
};

/**
 * Highlights / clips. PAFA has no YouTube channel yet, so this points families
 * to the official Facebook + Instagram where game clips and photos are posted.
 * When a highlight reel exists, swap this for an embedded/lazy-loaded player.
 */
export default function WatchHighlights() {
  return (
    <section id="highlights" aria-labelledby="highlights-heading" className="scroll-mt-24">
      <div className="glass-panel-strong relative overflow-hidden rounded-2xl">
        <div className="bg-grid-overlay" aria-hidden="true" />
        <div className="relative grid items-center gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
              Catch the Action
            </p>
            <h2 id="highlights-heading" className="text-display text-4xl md:text-5xl">
              Friday Night Highlights
            </h2>
            <p className="mt-3 max-w-md text-text-secondary">
              Big hits, big plays, and the roar of the Den. We post game clips, photos,
              and Panther moments all season long — follow along and tag your player.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {SOCIALS.map((s) => {
                const Icon = SOCIAL_ICONS[s.icon];
                return (
                  <Button key={s.label} variant="secondary" size="lg" className="gap-2" asChild>
                    <a href={s.href} target="_blank" rel="noopener noreferrer">
                      {Icon && <Icon className="size-5" aria-hidden="true" />}
                      Follow on {s.label}
                    </a>
                  </Button>
                );
              })}
            </div>
          </div>

          <div
            className="bg-media-placeholder relative flex items-center justify-center overflow-hidden rounded-xl border border-border-default"
            style={{ aspectRatio: "16 / 9" }}
            role="img"
            aria-label="Palatine Panthers game-day moments"
          >
            <Film className="size-12 text-text-muted/50" aria-hidden="true" />
            <span className="absolute bottom-3 left-4 text-sm font-medium text-text-secondary">
              Clips posted all season on social
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
