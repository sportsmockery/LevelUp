export default function RosterTable() {
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="px-4 py-3 font-sans font-semibold text-text-muted">#</th>
            <th className="px-4 py-3 font-sans font-semibold text-text-muted">Name</th>
            <th className="px-4 py-3 font-sans font-semibold text-text-muted">
              Position
            </th>
            <th className="px-4 py-3 font-sans font-semibold text-text-muted">Grade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={4}
              className="px-4 py-8 text-center text-text-secondary"
            >
              Roster will appear here once the operator provides data.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
