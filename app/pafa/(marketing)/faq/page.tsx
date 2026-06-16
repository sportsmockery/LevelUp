import FaqAccordion from "@/components/pafa/marketing/FaqAccordion";

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">FAQ</h1>
      <FaqAccordion />
    </div>
  );
}
