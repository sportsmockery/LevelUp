import SponsorWall from "@/components/pafa/marketing/SponsorWall";

export const metadata = { title: "Sponsors" };

export default function SponsorsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">Sponsors</h1>
      <SponsorWall />
    </div>
  );
}
