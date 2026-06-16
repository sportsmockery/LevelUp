import Button from "@/components/pafa/ui/Button";
import Input from "@/components/pafa/ui/Input";
import Label from "@/components/pafa/ui/Label";
import Select from "@/components/pafa/ui/Select";
import Textarea from "@/components/pafa/ui/Textarea";

export const metadata = { title: "Volunteer" };

export default function VolunteerPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">Volunteer</h1>
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="text-text-secondary">
          {/* COPY: volunteer intro */}
        </div>
        <form className="glass-panel space-y-4 rounded-2xl p-6">
          <div>
            <Label htmlFor="vol-name">Name</Label>
            <Input id="vol-name" />
          </div>
          <div>
            <Label htmlFor="vol-email">Email</Label>
            <Input id="vol-email" type="email" />
          </div>
          <div>
            <Label htmlFor="vol-phone">Phone</Label>
            <Input id="vol-phone" type="tel" />
          </div>
          <div>
            <Label htmlFor="vol-role">Role</Label>
            <Select id="vol-role" placeholder="Select role" aria-label="Role" />
          </div>
          <div>
            <Label htmlFor="vol-availability">Availability</Label>
            <Textarea id="vol-availability" />
          </div>
          <Button variant="primary" type="submit">
            Sign up
          </Button>
        </form>
      </div>
    </div>
  );
}
