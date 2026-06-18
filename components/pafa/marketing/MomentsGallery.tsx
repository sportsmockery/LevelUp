import { Camera } from "lucide-react";

/**
 * "Moments from the Den" — masonry photo wall.
 *
 * Each tile reserves space with a fixed aspect-ratio (zero CLS). Tiles are
 * branded gradient placeholders today; swap each <div data-image-slot> for an
 * <img loading="lazy" decoding="async" width=.. height=..> (or <picture>) once
 * real photos exist — the reserved box keeps layout stable on load.
 */
const MOMENTS: { label: string; ratio: string }[] = [
  { label: "Home opener under the lights", ratio: "4 / 5" },
  { label: "Cheer squad on the sideline", ratio: "1 / 1" },
  { label: "Touchdown celebration", ratio: "4 / 3" },
  { label: "Team huddle before kickoff", ratio: "1 / 1" },
  { label: "Friday night at Ost Field", ratio: "4 / 5" },
  { label: "Coaches teaching technique", ratio: "4 / 3" },
];

export default function MomentsGallery() {
  return (
    <section aria-labelledby="moments-heading">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
          Moments from the Den
        </p>
        <h2 id="moments-heading" className="text-display text-4xl md:text-5xl">
          This Is Panther Pride
        </h2>
      </div>

      <div className="columns-2 gap-4 [column-fill:_balance] lg:columns-3">
        {MOMENTS.map((m) => (
          <figure
            key={m.label}
            className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border-subtle"
          >
            <div
              data-image-slot="gallery-photo"
              role="img"
              aria-label={m.label}
              className="bg-media-placeholder flex w-full items-center justify-center"
              style={{ aspectRatio: m.ratio }}
            >
              <Camera className="size-8 text-text-muted/50" aria-hidden="true" />
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-sm font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {m.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
