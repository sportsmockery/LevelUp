"use client";

import { Play, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

/**
 * Highlights reel. The YouTube iframe is only mounted when the modal opens, so
 * it never blocks the main thread or hurts LCP/INP on initial load.
 * Replace VIDEO_ID with the real Panthers highlight reel.
 */
const VIDEO_ID = "dQw4w9WgXcQ"; // TODO: replace with official Panthers highlights ID

export default function WatchHighlights() {
  const [open, setOpen] = useState(false);

  return (
    <section id="highlights" aria-labelledby="highlights-heading" className="scroll-mt-24">
      <div className="glass-panel-strong relative overflow-hidden rounded-2xl">
        <div className="bg-grid-overlay" aria-hidden="true" />
        <div className="relative grid items-center gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
              Watch Highlights
            </p>
            <h2 id="highlights-heading" className="text-display text-4xl md:text-5xl">
              Feel the Friday Night Energy
            </h2>
            <p className="mt-3 max-w-md text-text-secondary">
              Big hits, big plays, and the roar of the Den. See what a season with the
              Palatine Panthers really looks like.
            </p>
          </div>

          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger
              aria-label="Play Palatine Panthers highlight reel"
              className="group bg-media-placeholder relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
              style={{ aspectRatio: "16 / 9" }}
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-brand-gold text-brand-black shadow-glow-gold transition-transform duration-200 group-hover:scale-110">
                <Play className="size-7 translate-x-0.5 fill-current" aria-hidden="true" />
              </span>
              <span className="absolute bottom-3 left-4 text-sm font-medium text-text-secondary">
                2025 Season Highlights · 2:14
              </span>
            </DialogPrimitive.Trigger>

            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
              <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 focus:outline-none">
                <DialogPrimitive.Title className="sr-only">
                  Palatine Panthers Highlights
                </DialogPrimitive.Title>
                <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16 / 9" }}>
                  {open && (
                    <iframe
                      className="absolute inset-0 size-full"
                      src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
                      title="Palatine Panthers Highlights"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  )}
                </div>
                <DialogPrimitive.Close
                  className="absolute -top-3 -right-3 rounded-full bg-bg-panel p-2 text-text-secondary ring-1 ring-border-strong hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                  aria-label="Close video"
                >
                  <X className="size-5" />
                </DialogPrimitive.Close>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </section>
  );
}
