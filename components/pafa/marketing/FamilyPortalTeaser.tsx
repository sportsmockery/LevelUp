import Link from "next/link";
import { Bell, Calendar, FileText, Wallet, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Button from "@/components/pafa/ui/Button";
import { BASE, PORTAL_FEATURES, type PortalFeature } from "@/lib/pafa/constants";

const ICONS: Record<PortalFeature["icon"], LucideIcon> = {
  calendar: Calendar,
  wallet: Wallet,
  fileText: FileText,
  bell: Bell,
};

export default function FamilyPortalTeaser() {
  return (
    <section aria-labelledby="portal-heading">
      <div className="glass-panel-strong glass-glow-blue grid gap-8 rounded-2xl p-8 md:grid-cols-2 md:p-12">
        <div className="flex flex-col justify-center">
          <p className="mb-2 text-sm font-semibold tracking-widest text-accent-blue uppercase">
            Family Portal
          </p>
          <h2 id="portal-heading" className="text-display text-4xl md:text-5xl">
            Your Whole Season, One Login
          </h2>
          <p className="mt-3 max-w-md text-text-secondary">
            Busy parent? We&apos;ve got you. Schedules, balances, documents, and
            real-time updates — all in one place, on every device.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" size="lg" asChild>
              <Link href={`${BASE}/dashboard`}>
                Open Family Portal
                <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link href={`${BASE}/register`}>Create your family account</Link>
            </Button>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-4">
          {PORTAL_FEATURES.map((f) => {
            const Icon = ICONS[f.icon];
            return (
              <li key={f.title} className="glass-panel-subtle flex flex-col gap-2 rounded-xl p-5">
                <Icon className="size-6 text-accent-blue" aria-hidden="true" />
                <span className="font-semibold text-text-primary">{f.title}</span>
                <span className="text-sm text-text-muted">{f.desc}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
