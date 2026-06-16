import ClearChart from "@/components/pafa/admin/ClearChart";
import ClearKPI from "@/components/pafa/admin/ClearKPI";

export const metadata = { title: "Xpairk Clear" };

export default function ClearPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16">
      <h1 className="text-display text-5xl">Overview</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <ClearKPI label="Registrations" />
        <ClearKPI label="Revenue" />
        <ClearKPI label="Active families" />
        <ClearKPI label="Volunteer hours" />
      </div>

      <ClearChart title="Registrations over time" />
      <ClearChart title="Revenue breakdown" />

      <section>
        <h2 className="mb-6 font-sans text-2xl font-semibold text-text-primary">
          Recent activity
        </h2>
        <div className="glass-panel rounded-xl p-6">
          <p className="text-text-secondary">{/* COPY: no recent activity */}</p>
        </div>
      </section>
    </div>
  );
}
