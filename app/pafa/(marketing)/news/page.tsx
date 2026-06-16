import { Card, CardBody } from "@/components/pafa/ui/Card";

export const metadata = { title: "News" };

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">News</h1>
      <div className="grid gap-8 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardBody className="space-y-3">
              <div
                data-image-slot="article-image"
                aria-hidden="true"
                className="aspect-[16/9] rounded-lg border border-border-subtle bg-bg-elevated"
              />
              <h2 className="font-sans text-xl font-semibold text-text-primary">
                {/* COPY: headline */}
              </h2>
              <p className="text-sm text-text-muted">{/* COPY: date */}</p>
              <p className="text-text-secondary">{/* COPY: excerpt */}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
