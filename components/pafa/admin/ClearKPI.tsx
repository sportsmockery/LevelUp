import Badge from "@/components/pafa/ui/Badge";
import { Card, CardBody } from "@/components/pafa/ui/Card";

interface Props {
  label?: string;
  value?: string | number;
  delta?: string;
  deltaVariant?: "success" | "danger";
}

export default function ClearKPI({
  label,
  value,
  delta,
  deltaVariant,
}: Props) {
  return (
    <Card variant="default" glow="blue">
      <CardBody>
        <p className="text-xs font-medium tracking-wider text-text-muted uppercase">
          {label ?? "--"}
        </p>
        <p className="text-display text-5xl tabular-nums text-text-primary">
          {value ?? "--"}
        </p>
        {delta && deltaVariant ? (
          <Badge variant={deltaVariant}>{delta}</Badge>
        ) : null}
        <div
          data-chart-slot="sparkline"
          className="mt-4 h-12 rounded-md border border-border-subtle bg-bg-elevated"
        />
      </CardBody>
    </Card>
  );
}
