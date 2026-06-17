"use client";

import { CalendarPlus } from "lucide-react";
import Button from "@/components/pafa/ui/Button";
import type { UpcomingGame } from "@/lib/pafa/constants";

/** ISO -> iCalendar UTC stamp (YYYYMMDDTHHMMSSZ). */
function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export default function AddToCalendarButton({ game }: { game: UpcomingGame }) {
  const handleDownload = () => {
    const title = `Panthers ${game.home ? "vs" : "@"} ${game.opponent}`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Palatine Panthers//PAFA//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${game.id}@palatinepanthers.com`,
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      `DTSTART:${toICSDate(game.start)}`,
      `DTEND:${toICSDate(game.end)}`,
      `SUMMARY:${escapeICS(title)}`,
      `LOCATION:${escapeICS(`${game.venueName}, ${game.venueAddress}`)}`,
      `DESCRIPTION:${escapeICS(
        `Palatine Panthers ${game.home ? "home" : "away"} game${game.note ? ` — ${game.note}` : ""}. Go Panthers!`,
      )}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `panthers-${game.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
      <CalendarPlus className="size-4" aria-hidden="true" />
      Add to Calendar
    </Button>
  );
}
