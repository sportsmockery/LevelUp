import { Card, CardBody } from "@/components/pafa/ui/Card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: slug };
}

export default async function NewsDetailPage({ params }: Props) {
  await params;

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <article className="space-y-6">
        <div
          data-image-slot="article-hero"
          aria-hidden="true"
          className="aspect-[21/9] w-full rounded-2xl border border-border-subtle bg-bg-elevated"
        />
        <h1 className="text-display text-5xl">
          {/* COPY: headline */}
        </h1>
        <p className="text-sm text-text-muted">{/* COPY: date */}</p>
        <div className="prose prose-invert max-w-none text-text-secondary">
          <p>{/* COPY: article body */}</p>
        </div>
      </article>

      <section>
        <h2 className="mb-8 font-sans text-2xl font-semibold text-text-primary">
          Related articles
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="subtle">
              <CardBody className="space-y-3">
                <div
                  data-image-slot="related-thumbnail"
                  aria-hidden="true"
                  className="aspect-[16/9] rounded-lg border border-border-subtle bg-bg-elevated"
                />
                <h3 className="font-sans font-semibold text-text-primary">
                  {/* COPY: related headline */}
                </h3>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
