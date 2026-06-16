"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { Card, CardBody } from "@/components/pafa/ui/Card";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Schedule", "Fees", "Equipment", "FAQ"] as const;

export default function ProgramTabs() {
  return (
    <TabsPrimitive.Root defaultValue="Overview">
      <TabsPrimitive.List className="glass-panel-subtle mb-6 flex flex-wrap gap-1 p-1">
        {TABS.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab}
            value={tab}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 data-[state=active]:bg-white/10 data-[state=active]:text-accent-blue"
            )}
          >
            {tab}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {TABS.map((tab) => (
        <TabsPrimitive.Content key={tab} value={tab}>
          <Card>
            <CardBody>
              <p className="text-text-secondary">
                {/* COPY: tab content */}
              </p>
            </CardBody>
          </Card>
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
