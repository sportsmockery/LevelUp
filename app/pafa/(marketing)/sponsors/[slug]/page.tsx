import ClearKPI from "@/components/pafa/admin/ClearKPI";
import Button from "@/components/pafa/ui/Button";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: slug };
}

export default async function SponsorDetailPage({ params }: Props) {
  await params;

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <div
        data-image-slot="sponsor-hero"
        aria-hidden="true"
        className="aspect-[21/9] w-full rounded-2xl border border-border-subtle bg-bg-elevated"
      />
      <h1 className="text-display text-5xl">
        {/* COPY: sponsor name */}
      </h1>
      <p className="max-w-3xl text-text-secondary">
        {/* COPY: sponsor body */}
      </p>
      <Button variant="outline">Visit website</Button>

      <section>
        <h2 className="mb-6 font-sans text-2xl font-semibold text-text-primary">
          Impression stats
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ClearKPI label="Impressions" />
          <ClearKPI label="Clicks" />
          <ClearKPI label="CTR" />
          <ClearKPI label="Reach" />
        </div>
      </section>
    </div>
  );
}
