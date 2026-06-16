export const metadata = { title: "Standings" };

export default function StandingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">Standings</h1>
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              {["Rank", "Team", "W", "L", "T", "PF", "PA", "Streak"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 font-sans font-semibold text-text-muted"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={8}
                className="px-4 py-8 text-center text-text-secondary"
              >
                Standings will appear here once the operator provides data.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
