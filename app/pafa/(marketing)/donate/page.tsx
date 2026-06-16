import Button from "@/components/pafa/ui/Button";
import Input from "@/components/pafa/ui/Input";
import Label from "@/components/pafa/ui/Label";
import Textarea from "@/components/pafa/ui/Textarea";

export const metadata = { title: "Donate" };

export default function DonatePage() {
  return (
    <div className="mx-auto max-w-xl space-y-16 px-6 py-12">
      <h1 className="text-display text-center text-5xl">Donate</h1>
      <form className="glass-panel-strong space-y-6 rounded-2xl p-8">
        <fieldset>
          <legend className="mb-4 font-sans font-semibold text-text-primary">
            Amount
          </legend>
          <div className="mb-4 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <button
                key={i}
                type="button"
                data-preset-slot={`preset-${i + 1}`}
                className="rounded-md border border-border-default px-4 py-2 text-sm text-text-primary hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
              >
                {/* COPY: preset amount */}
              </button>
            ))}
          </div>
          <Label htmlFor="custom-amount">Custom amount</Label>
          <Input id="custom-amount" type="number" placeholder="0.00" />
        </fieldset>

        <div>
          <Label htmlFor="donor-name">Name</Label>
          <Input id="donor-name" />
        </div>
        <div>
          <Label htmlFor="donor-email">Email</Label>
          <Input id="donor-email" type="email" />
        </div>
        <div>
          <Label htmlFor="donor-message">Message</Label>
          <Textarea id="donor-message" />
        </div>
        <Button variant="primary" type="submit" className="w-full">
          Donate
        </Button>
      </form>
    </div>
  );
}
