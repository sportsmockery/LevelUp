"use client";

import Link from "next/link";
import Button from "@/components/pafa/ui/Button";
import { BASE } from "@/lib/pafa/constants";

export default function PafaError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-panel max-w-md space-y-6 p-8 text-center">
        <p className="text-display text-8xl text-text-primary">500</p>
        <p className="text-text-secondary">{/* COPY: error message */}</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button variant="primary" asChild>
            <Link href={BASE}>Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
