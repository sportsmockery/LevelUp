import { cn } from "@/lib/utils";

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export default function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-md border border-border-default bg-white/5 p-3 text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
