import Link from "next/link";
import { Handshake } from "lucide-react";
import Button from "@/components/pafa/ui/Button";
import { BASE } from "@/lib/pafa/constants";

/**
 * Sponsor wall. Logos are CLS-safe placeholders (fixed aspect ratio); replace
 * each <div data-image-slot="sponsor"> with an <img loading="lazy"> logo.
 */
const SPONSOR_COUNT = 10;

export default function SponsorWall() {
  return (
    <section aria-labelledby="sponsors-heading">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
          Powered by Our Community
        </p>
        <h2 id="sponsors-heading" className="text-display text-4xl md:text-5xl">
          Proud Panther Sponsors
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
          Local businesses keep youth football affordable and accessible for every
          Palatine family. Thank you for backing the next generation.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {Array.from({ length: SPONSOR_COUNT }).map((_, i) => (
          <li
            key={i}
            className="glass-panel-subtle flex aspect-[3/2] items-center justify-center rounded-lg"
          >
            <div
              data-image-slot="sponsor"
              role="img"
              aria-label={`Sponsor ${i + 1} logo`}
              className="flex size-full items-center justify-center text-xs font-medium tracking-wide text-text-muted"
            >
              Your Logo Here
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <Button variant="secondary" size="lg" className="gap-2" asChild>
          <Link href={`${BASE}/sponsors`}>
            <Handshake className="size-5" aria-hidden="true" />
            Become a Sponsor
          </Link>
        </Button>
        <p className="text-sm text-text-muted">
          Reach thousands of local families every Friday night at Ost Field.
        </p>
      </div>
    </section>
  );
}
