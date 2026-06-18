"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";
import { PRIMARY_NAV, SITE, BASE } from "@/lib/pafa/constants";
import Button from "@/components/pafa/ui/Button";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === BASE ? pathname === BASE : pathname.startsWith(href);

  return (
    <header className="glass-panel-subtle fixed top-0 right-0 left-0 z-50 w-full border-b border-border-subtle">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href={BASE} className="flex items-center gap-3" aria-label={`${SITE.name} home`}>
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-md bg-brand-gold text-display text-xl text-brand-black"
          >
            P
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-display text-2xl text-text-primary">
              {SITE.name}
            </span>
            <span className="text-[10px] tracking-widest text-text-muted uppercase">
              Est. {SITE.founded}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60",
                isActive(item.href)
                  ? "text-accent-blue"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href={`${BASE}/register`}>Join the Pride</Link>
          </Button>
        </div>

        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger
            className="rounded-md p-2 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-6" />
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
            <DialogPrimitive.Content className="glass-panel-strong fixed top-0 right-0 z-50 flex h-full w-80 flex-col gap-4 p-6 focus:outline-none">
              <div className="flex items-center justify-between">
                <span className="text-display text-xl">{SITE.shortName}</span>
                <DialogPrimitive.Close
                  className="rounded-md p-2 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </DialogPrimitive.Close>
              </div>
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {PRIMARY_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60",
                      isActive(item.href)
                        ? "text-accent-blue"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2">
                <Button variant="ghost">Sign In</Button>
                <Button variant="primary" asChild>
                  <Link href={`${BASE}/register`} onClick={() => setOpen(false)}>
                    Join the Pride
                  </Link>
                </Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </header>
  );
}
