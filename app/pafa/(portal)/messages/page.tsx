export const metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <h1 className="text-display text-5xl">Messages</h1>
      <div className="glass-panel rounded-xl p-6">
        <p className="text-text-secondary">{/* COPY: no messages */}</p>
      </div>
    </div>
  );
}
