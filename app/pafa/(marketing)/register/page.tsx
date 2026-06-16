import Link from "next/link";
import { Card, CardBody } from "@/components/pafa/ui/Card";
import { BASE, PROGRAM_SLUGS } from "@/lib/pafa/constants";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">Register</h1>
      <p className="text-text-secondary">{/* COPY: register intro */}</p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PROGRAM_SLUGS.map((slug) => (
          <Link key={slug} href={`${BASE}/register/${slug}`}>
            <Card className="h-full transition-colors hover:border-border-strong">
              <CardBody className="space-y-3">
                <div
                  data-image-slot="program-icon"
                  aria-hidden="true"
                  className="aspect-square w-12 rounded-lg border border-border-subtle bg-bg-elevated"
                />
                <h2 className="font-sans font-semibold text-text-primary">
                  {/* COPY: program name */}
                </h2>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
