import Link from "next/link";
import Hero from "@/components/pafa/marketing/Hero";
import FeatureGrid from "@/components/pafa/marketing/FeatureGrid";
import SponsorWall from "@/components/pafa/marketing/SponsorWall";
import GameCard from "@/components/pafa/schedule/GameCard";
import Button from "@/components/pafa/ui/Button";
import { Card, CardBody } from "@/components/pafa/ui/Card";
import { BASE, PROGRAM_SLUGS } from "@/lib/pafa/constants";

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
        <FeatureGrid />

        <section>
          <h2 className="text-display mb-8 text-4xl">Programs</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROGRAM_SLUGS.map((slug) => (
              <Card key={slug}>
                <CardBody className="space-y-4">
                  <h3 className="font-sans font-semibold text-text-primary">
                    {/* COPY: program name */}
                  </h3>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`${BASE}/programs/${slug}`}>Learn more</Link>
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-display mb-8 text-4xl">Live now</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <GameCard />
            <GameCard />
            <GameCard />
          </div>
        </section>

        <section>
          <h2 className="text-display mb-8 text-4xl">Latest news</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardBody className="space-y-3">
                  <div
                    data-image-slot="news-thumbnail"
                    aria-hidden="true"
                    className="aspect-[16/9] rounded-lg border border-border-subtle bg-bg-elevated"
                  />
                  <h3 className="font-sans font-semibold text-text-primary">
                    {/* COPY: news headline */}
                  </h3>
                  <p className="text-sm text-text-muted">
                    {/* COPY: news date */}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        <SponsorWall />

        <section className="glass-panel-strong rounded-2xl p-8 text-center">
          <h2 className="text-display mb-4 text-4xl">
            {/* COPY: get involved heading */}
          </h2>
          <p className="mb-6 text-text-secondary">
            {/* COPY: get involved sub */}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" size="lg" asChild>
              <Link href={`${BASE}/register`}>Register</Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href={`${BASE}/volunteer`}>Volunteer</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
