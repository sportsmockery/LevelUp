import Link from "next/link";
import { MapPin } from "lucide-react";
import Badge from "@/components/pafa/ui/Badge";
import Button from "@/components/pafa/ui/Button";
import AddToCalendarButton from "@/components/pafa/marketing/AddToCalendarButton";
import { BASE, SEASON_EVENTS, type SeasonEvent } from "@/lib/pafa/constants";

const fmtDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/Chicago",
});
const fmtTime = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

const categoryVariant: Record<SeasonEvent["category"], "gold" | "blue" | "neutral"> = {
  Football: "gold",
  Camp: "blue",
  Team: "neutral",
  Community: "neutral",
};

export default function UpcomingGames() {
  return (
    <section id="schedule" aria-labelledby="games-heading" className="scroll-mt-24">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Mark Your Calendar
          </p>
          <h2 id="games-heading" className="text-display text-4xl md:text-5xl">
            Upcoming at the Den
          </h2>
          <p className="mt-3 max-w-xl text-text-secondary">
            The 2026 BGYFL game schedule drops soon (Week 1 kicks off Aug 29). Here are
            the key dates every Panther family needs.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href={`${BASE}/schedule`}>Full schedule →</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SEASON_EVENTS.map((event) => (
          <article key={event.id} className="glass-panel flex flex-col rounded-xl p-6">
            <div className="flex items-center justify-between">
              <Badge variant={categoryVariant[event.category]}>{event.category}</Badge>
              <time
                dateTime={event.start}
                className="font-mono text-sm tabular-nums text-text-secondary"
              >
                {fmtDate.format(new Date(event.start))}
              </time>
            </div>

            <h3 className="text-display mt-5 text-2xl text-text-primary">
              {event.title}
            </h3>

            {event.note && (
              <p className="mt-2 text-sm font-medium text-brand-gold">{event.note}</p>
            )}

            <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
              <span className="font-mono tabular-nums">
                {fmtTime.format(new Date(event.start))}
              </span>
              <span aria-hidden="true">·</span>
              <span>{event.locationName}</span>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
              <AddToCalendarButton event={event} />
              {event.mapsQuery && (
                <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${event.mapsQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="size-4" aria-hidden="true" />
                    Directions
                  </a>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
