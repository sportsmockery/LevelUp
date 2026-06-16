import Link from "next/link";
import Button from "@/components/pafa/ui/Button";
import { Card, CardBody } from "@/components/pafa/ui/Card";
import { BASE } from "@/lib/pafa/constants";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">About</h1>

      <Card>
        <CardBody>
          <h2 className="mb-4 font-sans text-xl font-semibold text-text-primary">
            Mission
          </h2>
          <p className="text-text-secondary">{/* COPY: mission */}</p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-4 font-sans text-xl font-semibold text-text-primary">
            History
          </h2>
          <p className="text-text-secondary">{/* COPY: history */}</p>
        </CardBody>
      </Card>

      <section>
        <h2 className="mb-8 font-sans text-2xl font-semibold text-text-primary">
          Board &amp; Volunteers
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} variant="subtle">
              <CardBody className="flex flex-col items-center text-center">
                <div
                  data-image-slot="person-avatar"
                  aria-hidden="true"
                  className="mb-3 size-20 rounded-full border border-border-subtle bg-bg-elevated"
                />
                <h3 className="font-sans font-semibold text-text-primary">
                  {/* COPY: person name */}
                </h3>
                <p className="text-sm text-text-muted">{/* COPY: role */}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardBody>
          <h2 className="mb-4 font-sans text-xl font-semibold text-text-primary">
            Code of Conduct
          </h2>
          <p className="mb-4 text-text-secondary">
            {/* COPY: code of conduct */}
          </p>
          <Button variant="outline">Download</Button>
        </CardBody>
      </Card>

      <section className="glass-panel-strong rounded-2xl p-8 text-center">
        <h2 className="text-display mb-4 text-3xl">
          {/* COPY: contact CTA heading */}
        </h2>
        <Button variant="primary" asChild>
          <Link href={`${BASE}/contact`}>Contact us</Link>
        </Button>
      </section>
    </div>
  );
}
