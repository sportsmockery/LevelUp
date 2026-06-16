"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PORTAL_NAV } from "@/lib/pafa/constants";
import { cn } from "@/lib/utils";

export default function PortalLayoutClient({
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
      <div className="flex min-h-screen pt-0">
        <aside className="glass-panel hidden w-64 shrink-0 flex-col border-r border-border-subtle p-4 lg:flex">
          <nav className="flex flex-col gap-1" aria-label="Portal">
            {PORTAL_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60",
                  pathname.startsWith(item.href)
                    ? "bg-white/10 text-accent-blue"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              className="mt-4 rounded-md px-3 py-2 text-left text-sm text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
            >
              Sign out
            </button>
          </nav>
        </aside>
        <main id="main-content" className="min-h-screen flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </>
  );
}
