import Link from "next/link";
import { Check, Flag, Shield, Sparkles, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Badge from "@/components/pafa/ui/Badge";
import Button from "@/components/pafa/ui/Button";
import { BASE, PROGRAMS, type Program } from "@/lib/pafa/constants";

const ICONS: Record<Program["icon"], LucideIcon> = {
  shield: Shield,
  flag: Flag,
  sparkles: Sparkles,
  sun: Sun,
};

export default function ProgramCards() {
  return (
    <section id="programs" aria-labelledby="programs-heading" className="scroll-mt-24">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Pick Your Program
          </p>
          <h2 id="programs-heading" className="text-display text-4xl md:text-5xl">
            A Place for Every Panther
          </h2>
        </div>
        <Button variant="ghost" asChild>
          <Link href={`${BASE}/programs`}>Compare all programs →</Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PROGRAMS.map((p) => {
          const Icon = ICONS[p.icon];
          const accentText =
            p.accent === "gold" ? "text-brand-gold" : "text-accent-blue";
          const accentRing =
            p.accent === "gold"
              ? "bg-brand-gold/10 ring-brand-gold/20"
              : "bg-accent-blue/10 ring-accent-blue/20";
          return (
            <article
              key={p.slug}
              className="glass-panel flex flex-col rounded-xl p-6 transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={`flex size-12 items-center justify-center rounded-xl ring-1 ${accentRing}`}
                >
                  <Icon className={`size-6 ${accentText}`} aria-hidden="true" />
                </span>
                <Badge variant={p.accent === "gold" ? "gold" : "blue"}>
                  {p.grades}
                </Badge>
              </div>

              <h3 className="font-sans text-xl font-semibold text-text-primary">
                {p.name}
              </h3>
              <p className={`mt-1 text-sm font-medium ${accentText}`}>{p.tagline}</p>

              <ul className="mt-4 flex-1 space-y-2">
                {p.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-border-subtle pt-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-text-muted">{p.season}</span>
                  <span className="font-semibold text-text-primary">{p.price}</span>
                </div>
                <Button variant="primary" size="md" className="w-full" asChild>
                  <Link href={`${BASE}/register/${p.slug}`}>
                    Register for {p.name.split(" ")[0]}
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
