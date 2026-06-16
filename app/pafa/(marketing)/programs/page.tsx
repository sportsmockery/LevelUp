import Link from "next/link";
import Button from "@/components/pafa/ui/Button";
import { Card, CardBody } from "@/components/pafa/ui/Card";
import { BASE, PROGRAM_SLUGS } from "@/lib/pafa/constants";

export const metadata = { title: "Programs" };

export default function ProgramsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">Programs</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {PROGRAM_SLUGS.map((slug) => (
          <Card key={slug}>
            <CardBody className="space-y-4">
              <div
                data-image-slot="program-image"
                aria-hidden="true"
                className="aspect-[16/9] rounded-lg border border-border-subtle bg-bg-elevated"
              />
              <h2 className="font-sans text-xl font-semibold text-text-primary">
                {/* COPY: program name */}
              </h2>
              <p className="text-sm text-text-secondary">
                {/* COPY: age range */}
              </p>
              <p className="text-sm text-text-muted">
                {/* COPY: season dates */}
              </p>
              <Button variant="primary" asChild>
                <Link href={`${BASE}/register/${slug}`}>Register</Link>
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
