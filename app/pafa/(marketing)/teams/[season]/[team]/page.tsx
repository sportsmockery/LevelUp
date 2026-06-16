import TeamDetailTabs from "@/components/pafa/team/TeamDetailTabs";

interface Props {
  params: Promise<{ season: string; team: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { team } = await params;
  return { title: team };
}

export default async function TeamDetailPage({ params }: Props) {
  const { season, team } = await params;
  return <TeamDetailTabs season={season} team={team} />;
}
