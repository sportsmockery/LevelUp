import { cn } from "@/lib/utils";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border-default bg-white/5 px-3 text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
