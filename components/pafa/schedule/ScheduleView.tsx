"use client";

import { useState } from "react";
import GameCard from "@/components/pafa/schedule/GameCard";
import Button from "@/components/pafa/ui/Button";
import Select from "@/components/pafa/ui/Select";

export default function ScheduleView() {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div className="space-y-8">
      <div className="glass-panel-subtle sticky top-20 z-40 flex flex-wrap items-center gap-4 rounded-xl p-4">
        <Select placeholder="Season" aria-label="Season" className="w-36" />
        <Select placeholder="Program" aria-label="Program" className="w-36" />
        <Select placeholder="Team" aria-label="Team" className="w-36" />
        <div className="ml-auto flex gap-2">
          <Button
            variant={view === "list" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            List
          </Button>
          <Button
            variant={view === "calendar" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setView("calendar")}
          >
            Calendar
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <GameCard key={i} />
          ))}
        </div>
      ) : (
        <div
          data-view-slot="calendar"
          className="glass-panel aspect-[4/3] w-full rounded-xl"
        />
      )}
    </div>
  );
}
