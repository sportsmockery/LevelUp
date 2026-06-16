import FamilyCard from "@/components/pafa/portal/FamilyCard";
import GameCard from "@/components/pafa/schedule/GameCard";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16">
      <h1 className="text-display text-5xl">Dashboard</h1>

      <section>
        <h2 className="mb-6 font-sans text-2xl font-semibold text-text-primary">
          Family
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FamilyCard />
          <FamilyCard />
          <FamilyCard />
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-sans text-2xl font-semibold text-text-primary">
          Upcoming this week
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <GameCard />
          <GameCard />
          <GameCard />
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-sans text-2xl font-semibold text-text-primary">
          Action required
        </h2>
        <div className="glass-panel rounded-xl p-6">
          <p className="text-text-secondary">
            {/* COPY: no actions message */}
          </p>
        </div>
      </section>
    </div>
  );
}
