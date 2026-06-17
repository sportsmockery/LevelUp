import Link from "next/link";
import { MapPin } from "lucide-react";
import Badge from "@/components/pafa/ui/Badge";
import Button from "@/components/pafa/ui/Button";
import AddToCalendarButton from "@/components/pafa/marketing/AddToCalendarButton";
import { BASE, UPCOMING_GAMES } from "@/lib/pafa/constants";

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

export default function UpcomingGames() {
  return (
    <section id="schedule" aria-labelledby="games-heading" className="scroll-mt-24">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Upcoming Games
          </p>
          <h2 id="games-heading" className="text-display text-4xl md:text-5xl">
            See You Under the Lights
          </h2>
        </div>
        <Button variant="ghost" asChild>
          <Link href={`${BASE}/schedule`}>Full schedule →</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {UPCOMING_GAMES.map((game) => (
          <article key={game.id} className="glass-panel flex flex-col rounded-xl p-6">
            <div className="flex items-center justify-between">
              <Badge variant={game.home ? "gold" : "neutral"}>
                {game.home ? "Home" : "Away"}
              </Badge>
              <time
                dateTime={game.start}
                className="font-mono text-sm tabular-nums text-text-secondary"
              >
                {fmtDate.format(new Date(game.start))}
              </time>
            </div>

            <div className="mt-5 flex flex-col items-center gap-1 text-center">
              <span className="text-display text-2xl text-text-primary">
                Panthers
              </span>
              <span className="text-sm font-medium text-text-muted">
                {game.home ? "vs" : "@"}
              </span>
              <span className="text-display text-2xl text-text-primary">
                {game.opponent}
              </span>
            </div>

            {game.note && (
              <p className="mt-3 text-center text-sm font-medium text-brand-gold">
                {game.note}
              </p>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-text-secondary">
              <span className="font-mono tabular-nums">
                {fmtTime.format(new Date(game.start))}
              </span>
              <span aria-hidden="true">·</span>
              <span>{game.venueName}</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-border-subtle pt-4">
              <AddToCalendarButton game={game} />
              <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${game.mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="size-4" aria-hidden="true" />
                  Directions
                </a>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
