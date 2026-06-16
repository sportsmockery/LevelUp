import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral:
          "border-border-default bg-white/5 text-text-secondary",
        blue: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
        gold: "border-brand-gold/30 bg-brand-gold/10 text-brand-gold",
        success:
          "border-status-success/30 bg-status-success/10 text-status-success",
        warning:
          "border-status-warning/30 bg-status-warning/10 text-status-warning",
        danger: "border-status-danger/30 bg-status-danger/10 text-status-danger",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

interface Props
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export default function Badge({ className, variant, ...props }: Props) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
