import Link from "next/link";
import { BASE } from "@/lib/pafa/constants";

/**
 * Thumb-friendly sticky CTA shown only on small screens. Respects the device
 * safe-area inset and meets the 44×44px minimum touch-target guidance.
 */
export default function StickyMobileCTA() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-strong bg-bg-base/90 p-3 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <Link
        href={`${BASE}/register`}
        className="flex min-h-[44px] w-full items-center justify-center rounded-md bg-accent-blue px-6 text-base font-semibold text-white shadow-glow-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
      >
        Join the Pride →
      </Link>
    </div>
  );
}
