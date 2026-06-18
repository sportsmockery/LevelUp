"use client";

import { CalendarPlus } from "lucide-react";
import Button from "@/components/pafa/ui/Button";
import type { SeasonEvent } from "@/lib/pafa/constants";

/** ISO -> iCalendar UTC stamp (YYYYMMDDTHHMMSSZ). */
function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export default function AddToCalendarButton({ event }: { event: SeasonEvent }) {
  const handleDownload = () => {
    const location = event.locationAddress
      ? `${event.locationName}, ${event.locationAddress}`
      : event.locationName;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Palatine Panthers//PAFA//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${event.id}@palatinepanthers.com`,
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      `DTSTART:${toICSDate(event.start)}`,
      `DTEND:${toICSDate(event.end)}`,
      `SUMMARY:${escapeICS(`Panthers — ${event.title}`)}`,
      `LOCATION:${escapeICS(location)}`,
      `DESCRIPTION:${escapeICS(event.note ? `${event.note}. Go Panthers!` : "Go Panthers!")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `panthers-${event.id}.ics`;
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
