import Button from "@/components/pafa/ui/Button";
import { Card, CardBody } from "@/components/pafa/ui/Card";

export const metadata = { title: "Store" };

export default function StorePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">Store</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} variant="subtle">
            <CardBody className="space-y-3">
              <div
                data-image-slot="product-image"
                aria-hidden="true"
                className="aspect-square rounded-lg border border-border-subtle bg-bg-elevated"
              />
              <h2 className="font-sans font-semibold text-text-primary">
                {/* COPY: product name */}
              </h2>
              <p className="font-mono tabular-nums text-text-secondary">
                {/* COPY: price */}
              </p>
              <Button variant="outline" size="sm">
                Add to cart
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
