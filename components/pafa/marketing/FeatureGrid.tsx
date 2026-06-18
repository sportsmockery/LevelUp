import { HeartHandshake, ShieldCheck, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Benefit {
  icon: LucideIcon;
  title: string;
  body: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: ShieldCheck,
    title: "Safety First, Always",
    body: "USA Football Heads Up certified coaches, weight-bracketed teams, and modern equipment standards. The right way to play — so kids stay healthy and love the game.",
  },
  {
    icon: HeartHandshake,
    title: "Character On & Off the Field",
    body: "We build confidence, discipline, and teamwork that follow your child into the classroom and beyond. Effort and respect matter more than the scoreboard.",
  },
  {
    icon: Users,
    title: "A Real Community",
    body: "Friday nights at Ost Field, team dinners, and lifelong friendships for kids and parents alike. When you join the Panthers, you join a family.",
  },
  {
    icon: Trophy,
    title: "A Legacy of Excellence",
    body: "Competing in the Bill George Youth Football League since 1966. Generations of Palatine families have worn black and gold — now it's your turn.",
  },
];

export default function FeatureGrid() {
  return (
    <section id="why-pafa" aria-labelledby="why-pafa-heading" className="scroll-mt-24">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
          Why Families Choose PAFA
        </p>
        <h2 id="why-pafa-heading" className="text-display text-4xl md:text-5xl">
          More Than a Team
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
          For busy Palatine parents, the choice is simple: a program built on safety,
          character, and belonging — that your kids will beg to come back to.
        </p>
      </div>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <li
            key={b.title}
            className="glass-panel flex flex-col gap-3 rounded-xl p-6 transition-transform duration-200 hover:-translate-y-1"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-gold/10 ring-1 ring-brand-gold/20">
              <b.icon className="size-6 text-brand-gold" aria-hidden="true" />
            </span>
            <h3 className="font-sans text-lg font-semibold text-text-primary">
              {b.title}
            </h3>
            <p className="text-sm text-text-secondary">{b.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
