interface Props {
  title: string;
}

export function AdminStubPage({ title }: Props) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <h1 className="text-display text-5xl">{title}</h1>
      <div className="glass-panel rounded-xl p-6">
        <p className="text-text-secondary">{/* COPY: admin section content */}</p>
      </div>
    </div>
  );
}
