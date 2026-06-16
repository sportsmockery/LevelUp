import Select from "@/components/pafa/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/pafa/ui/Card";

interface Props {
  title?: string;
}

export default function ClearChart({ title }: Props) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-sans font-semibold text-text-primary">
          {title ?? "--"}
        </h3>
        <Select placeholder="Filter" aria-label="Chart filter" />
      </CardHeader>
      <CardBody>
        <div
          data-chart-slot="chart"
          className="aspect-[16/7] w-full rounded-lg border border-border-subtle bg-bg-elevated"
        />
      </CardBody>
    </Card>
  );
}
