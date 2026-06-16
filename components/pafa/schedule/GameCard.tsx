import Badge from "@/components/pafa/ui/Badge";
import Button from "@/components/pafa/ui/Button";
import LivePing from "@/components/pafa/ui/LivePing";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/pafa/ui/Card";

type GameStatus = "Upcoming" | "Live" | "Final";

interface Props {
  home?: string;
  away?: string;
  score?: { home: number; away: number };
  venue?: string;
  startsAt?: string;
  status?: GameStatus;
}

const statusVariant: Record<GameStatus, "neutral" | "blue" | "success"> = {
  Upcoming: "neutral",
  Live: "blue",
  Final: "success",
};

export default function GameCard({
  home,
  away,
  score,
  venue,
  startsAt,
  status = "Upcoming",
}: Props) {
  return (
    <Card>
      <CardHeader>
        <Badge variant="neutral">
          <span className="font-mono tabular-nums">{startsAt ?? "--"}</span>
        </Badge>
        <Badge variant={statusVariant[status]} className="gap-1.5">
          {status === "Live" && <LivePing />}
          {status}
        </Badge>
      </CardHeader>
      <CardBody>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <div
              data-image-slot="team-logo-home"
              aria-hidden="true"
              className="aspect-square w-12 rounded-lg border border-border-subtle bg-bg-elevated"
            />
            <span className="text-sm font-medium text-text-primary">
              {home ?? "--"}
            </span>
          </div>
          <div className="text-display text-4xl tabular-nums text-text-primary">
            {score ? `${score.home}–${score.away}` : "--"}
          </div>
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <div
              data-image-slot="team-logo-away"
              aria-hidden="true"
              className="aspect-square w-12 rounded-lg border border-border-subtle bg-bg-elevated"
            />
            <span className="text-sm font-medium text-text-primary">
              {away ?? "--"}
            </span>
          </div>
        </div>
      </CardBody>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-text-muted">
          <span>{venue ?? "--"}</span>
        </div>
        <Button variant="ghost" size="sm">
          View details
        </Button>
      </CardFooter>
    </Card>
  );
}
