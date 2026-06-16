import { Card, CardBody } from "@/components/pafa/ui/Card";
import Select from "@/components/pafa/ui/Select";

export const metadata = { title: "Teams" };

export default function TeamsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-display text-5xl">Teams</h1>
        <Select placeholder="Season" aria-label="Select season" className="w-48" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardBody className="space-y-3">
              <div
                data-image-slot="team-logo"
                aria-hidden="true"
                className="aspect-square w-16 rounded-lg border border-border-subtle bg-bg-elevated"
              />
              <h2 className="font-sans font-semibold text-text-primary">
                {/* COPY: team name */}
              </h2>
              <p className="text-sm text-text-muted">{/* COPY: record */}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
