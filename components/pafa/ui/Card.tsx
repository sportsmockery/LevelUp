import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "subtle";
  glow?: "none" | "blue" | "gold";
}

const variantClasses = {
  default: "glass-panel",
  strong: "glass-panel-strong",
  subtle: "glass-panel-subtle",
} as const;

const glowClasses = {
  none: "",
  blue: "glass-glow-blue",
  gold: "glass-glow-gold",
} as const;

export function Card({
  className,
  variant = "default",
  glow = "none",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantClasses[variant],
        glowClasses[glow],
        "p-6",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-4 flex items-center justify-between", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-3", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-4 border-t border-border-subtle pt-4", className)}
      {...props}
    />
  );
}
