"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, BASE } from "@/lib/pafa/constants";
import { cn } from "@/lib/utils";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-accent-blue focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <aside className="glass-panel hidden w-64 shrink-0 flex-col border-r border-border-subtle p-4 lg:flex">
          <p className="text-display mb-4 text-lg text-brand-gold">Xpairk Clear</p>
          <nav className="flex flex-col gap-1" aria-label="Admin">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60",
                  pathname === item.href || (item.label === "Overview" && pathname === `${BASE}/clear`)
                    ? "bg-white/10 text-accent-blue"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="main-content" className="min-h-screen flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </>
  );
}
