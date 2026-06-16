import Link from "next/link";
import ProgramTabs from "@/components/pafa/marketing/ProgramTabs";
import Button from "@/components/pafa/ui/Button";
import { BASE, PROGRAM_SLUGS } from "@/lib/pafa/constants";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return PROGRAM_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: slug };
}

export default async function ProgramDetailPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12 flex flex-col gap-6 lg:flex-row">
        <div
          data-image-slot="program-hero"
          aria-hidden="true"
          className="aspect-[16/9] flex-1 rounded-2xl border border-border-subtle bg-bg-elevated"
        />
        <div className="flex flex-col justify-center">
          <h1 className="text-display text-5xl">
            {/* COPY: program name */}
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <ProgramTabs />
        </div>

        <aside className="lg:w-80">
          <div className="glass-panel-strong sticky top-24 space-y-6 rounded-2xl p-6">
            <Button variant="primary" size="lg" className="w-full" asChild>
              <Link href={`${BASE}/register/${slug}`}>Register now</Link>
            </Button>
            <div>
              <h3 className="mb-3 font-sans font-semibold text-text-primary">
                Key dates
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>{/* COPY: key date 1 */}</li>
                <li>{/* COPY: key date 2 */}</li>
                <li>{/* COPY: key date 3 */}</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
