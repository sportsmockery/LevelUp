import RegisterFlow from "@/components/pafa/marketing/RegisterFlow";
import { PROGRAM_SLUGS } from "@/lib/pafa/constants";

interface Props {
  params: Promise<{ program: string }>;
}

export function generateStaticParams() {
  return PROGRAM_SLUGS.map((program) => ({ program }));
}

export async function generateMetadata({ params }: Props) {
  const { program } = await params;
  return { title: `Register — ${program}` };
}

export default async function RegisterProgramPage({ params }: Props) {
  const { program } = await params;
  return <RegisterFlow program={program} />;
}
