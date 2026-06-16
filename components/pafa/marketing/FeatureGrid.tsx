import type { LucideIcon } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/pafa/ui/Card";

interface Feature {
  icon: LucideIcon;
  title: string;
  bodySlot: string;
}

interface Props {
  features?: Feature[];
}

export default function FeatureGrid({ features = [] }: Props) {
  if (features.length === 0) {
    return (
      <section>
        <h2 className="text-display mb-8 text-center text-4xl">
          {/* COPY: features section heading */}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <h3 className="font-sans font-semibold text-text-primary">
                {/* COPY: feature 1 title */}
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-text-secondary">{/* COPY: feature 1 */}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-sans font-semibold text-text-primary">
                {/* COPY: feature 2 title */}
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-text-secondary">{/* COPY: feature 2 */}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-sans font-semibold text-text-primary">
                {/* COPY: feature 3 title */}
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-text-secondary">{/* COPY: feature 3 */}</p>
            </CardBody>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-display mb-8 text-center text-4xl">
        {/* COPY: features section heading */}
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <feature.icon className="size-6 text-accent-blue" aria-hidden="true" />
              <h3 className="font-sans font-semibold text-text-primary">
                {feature.title}
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-text-secondary">{/* COPY: {feature.bodySlot} */}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
