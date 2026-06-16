export const metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <h1 className="text-display text-5xl">Documents</h1>
      <div className="glass-panel rounded-xl p-6">
        <p className="text-text-secondary">{/* COPY: no documents */}</p>
      </div>
    </div>
  );
}
