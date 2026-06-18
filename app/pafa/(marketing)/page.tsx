import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/pafa/marketing/Hero";
import FeatureGrid from "@/components/pafa/marketing/FeatureGrid";
import ProgramCards from "@/components/pafa/marketing/ProgramCards";
import FamilyPortalTeaser from "@/components/pafa/marketing/FamilyPortalTeaser";
import UpcomingGames from "@/components/pafa/marketing/UpcomingGames";
import MomentsGallery from "@/components/pafa/marketing/MomentsGallery";
import WatchHighlights from "@/components/pafa/marketing/WatchHighlights";
import Testimonials from "@/components/pafa/marketing/Testimonials";
import LeadCaptureForm from "@/components/pafa/marketing/LeadCaptureForm";
import SponsorWall from "@/components/pafa/marketing/SponsorWall";
import StickyMobileCTA from "@/components/pafa/marketing/StickyMobileCTA";
import StructuredData from "@/components/pafa/marketing/StructuredData";
import Button from "@/components/pafa/ui/Button";
import { BASE, SITE } from "@/lib/pafa/constants";

const description =
  "Palatine Panthers (PAFA) — youth tackle & flag football, cheerleading, and summer camp for grades K–8 in Palatine, IL. Heads Up certified coaching, real community, and Friday night lights at Ost Field since 1966. Register today.";

export const metadata: Metadata = {
  title: {
    absolute: "Palatine Panthers Youth Football & Cheer — Grades K–8 | Palatine, IL",
  },
  description,
  alternates: { canonical: `${BASE}` },
  keywords: [
    "Palatine youth football",
    "PAFA",
    "Palatine Panthers",
    "youth tackle football",
    "flag football Palatine",
    "youth cheerleading Palatine IL",
    "BGYFL",
    "Ost Field",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "Palatine Panthers — Welcome to the Den",
    description,
    url: SITE.url,
    images: [
      {
        url: "/pafa/media/hero-poster.svg",
        width: 1600,
        height: 900,
        alt: "Palatine Panthers under the Friday night lights at Ost Field",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Palatine Panthers — Welcome to the Den",
    description,
    images: ["/pafa/media/hero-poster.svg"],
  },
};

export default function HomePage() {
  return (
    <>
      {/* Preload the LCP hero poster. React 19 hoists this into <head>. */}
      <link
        rel="preload"
        as="image"
        href="/pafa/media/hero-poster.svg"
        fetchPriority="high"
      />

      <StructuredData />

      <Hero />

      <div className="mx-auto max-w-7xl space-y-24 px-6 py-20">
        <FeatureGrid />
        <ProgramCards />
        <FamilyPortalTeaser />
        <UpcomingGames />
        <MomentsGallery />
        <WatchHighlights />
        <Testimonials />
        <LeadCaptureForm />
        <SponsorWall />

        {/* Final conversion CTA */}
        <section className="bg-field-hero glass-panel-strong relative overflow-hidden rounded-2xl p-10 text-center md:p-16">
          <div className="bg-grid-overlay" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-display text-4xl md:text-6xl">
              Ready to Join the Den?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-text-secondary">
              Spots fill fast every season. Secure your young Panther&apos;s place today
              and become part of a Palatine tradition more than 50 years strong.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="primary" size="lg" asChild>
                <Link href={`${BASE}/register`}>Register Now →</Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <Link href={`${BASE}/volunteer`}>Volunteer or Coach</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Spacer so the sticky mobile CTA never covers footer content */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <StickyMobileCTA />
    </>
  );
}
