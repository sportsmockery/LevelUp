import Badge from "@/components/pafa/ui/Badge";
import Button from "@/components/pafa/ui/Button";
import { Card, CardBody } from "@/components/pafa/ui/Card";

export default function FamilyCard() {
  return (
    <Card>
      <CardBody>
        <div className="flex gap-4">
          <div
            data-image-slot="child-avatar"
            aria-hidden="true"
            className="size-16 shrink-0 rounded-lg border border-border-subtle bg-bg-elevated"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <h3 className="font-sans font-semibold text-text-primary">
              {/* COPY: child name */}
            </h3>
            <Badge variant="gold">{/* COPY: team badge */}</Badge>
            <div className="text-sm text-text-secondary">
              <span className="text-text-muted">Next event: </span>
              {/* COPY: date */} vs {/* COPY: opponent */}
            </div>
            <div className="font-mono text-sm tabular-nums text-text-secondary">
              <span className="text-text-muted">Balance: </span>--
            </div>
            <Button variant="outline" size="sm">
              View team
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
