"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import GameCard from "@/components/pafa/schedule/GameCard";
import RosterTable from "@/components/pafa/team/RosterTable";
import Badge from "@/components/pafa/ui/Badge";
import { Card, CardBody } from "@/components/pafa/ui/Card";
import { cn } from "@/lib/utils";

interface Props {
  season: string;
  team: string;
}

const TABS = ["Roster", "Schedule", "Coaches", "Photos"] as const;

export default function TeamDetailTabs({ season, team }: Props) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-display text-5xl">
          {/* COPY: team name */}
        </h1>
        <Badge variant="gold">{/* COPY: record */}</Badge>
        <Badge variant="neutral">{season}</Badge>
      </div>

      <TabsPrimitive.Root defaultValue="Roster">
        <TabsPrimitive.List className="glass-panel-subtle mb-6 flex flex-wrap gap-1 p-1">
          {TABS.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab}
              value={tab}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 data-[state=active]:bg-white/10 data-[state=active]:text-accent-blue"
              )}
            >
              {tab}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="Roster">
          <RosterTable />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="Schedule">
          <div className="grid gap-6 md:grid-cols-3">
            <GameCard />
            <GameCard />
            <GameCard />
          </div>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="Coaches">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} variant="subtle">
                <CardBody className="flex flex-col items-center text-center">
                  <div
                    data-image-slot="coach-avatar"
                    aria-hidden="true"
                    className="mb-3 size-20 rounded-full border border-border-subtle bg-bg-elevated"
                  />
                  <h3 className="font-sans font-semibold text-text-primary">
                    {/* COPY: coach name */}
                  </h3>
                  <p className="text-sm text-text-muted">{/* COPY: role */}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="Photos">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                data-image-slot="team-photo"
                aria-hidden="true"
                className="aspect-square rounded-lg border border-border-subtle bg-bg-elevated"
              />
            ))}
          </div>
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      <span className="sr-only">{team}</span>
    </div>
  );
}
