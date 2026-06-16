import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

interface Props extends React.ComponentProps<typeof LabelPrimitive.Root> {}

export default function Label({ className, ...props }: Props) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-xs font-medium uppercase tracking-wider text-text-muted",
        className
      )}
      {...props}
    />
  );
}
