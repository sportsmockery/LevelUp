import { Quote, Star } from "lucide-react";
import { TESTIMONIALS } from "@/lib/pafa/constants";

export default function Testimonials() {
  return (
    <section aria-labelledby="voices-heading">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
          Panther Parent Voices
        </p>
        <h2 id="voices-heading" className="text-display text-4xl md:text-5xl">
          Loved by Palatine Families
        </h2>
        <div className="mt-3 flex items-center justify-center gap-1" aria-label="Rated 5 out of 5 by Panther families">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-5 fill-brand-gold text-brand-gold" aria-hidden="true" />
          ))}
        </div>
      </div>

      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <li key={t.name} className="glass-panel flex flex-col gap-4 rounded-xl p-6">
            <Quote className="size-7 text-brand-gold/60" aria-hidden="true" />
            <blockquote className="flex-1 text-text-secondary">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-3 border-t border-border-subtle pt-4">
              <span
                aria-hidden="true"
                className="bg-media-placeholder flex size-10 items-center justify-center rounded-full text-sm font-semibold text-brand-gold"
              >
                {t.name.charAt(0)}
              </span>
              <span className="leading-tight">
                <span className="block font-semibold text-text-primary">{t.name}</span>
                <span className="block text-sm text-text-muted">{t.role}</span>
              </span>
            </figcaption>
          </li>
        ))}
      </ul>
    </section>
  );
}
