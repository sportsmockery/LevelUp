import ScheduleView from "@/components/pafa/schedule/ScheduleView";

export const metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">Schedule</h1>
      <ScheduleView />
    </div>
  );
}
