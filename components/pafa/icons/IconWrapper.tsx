import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

export default function IconWrapper({ icon: Icon, className, size = 20 }: Props) {
  return <Icon className={cn("shrink-0", className)} size={size} aria-hidden="true" />;
}
