import Button from "@/components/pafa/ui/Button";
import Input from "@/components/pafa/ui/Input";
import Label from "@/components/pafa/ui/Label";
import Textarea from "@/components/pafa/ui/Textarea";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
      <h1 className="text-display text-5xl">Contact</h1>
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6 text-text-secondary">
          <div>
            <h2 className="mb-2 font-sans font-semibold text-text-primary">
              Address
            </h2>
            <p>{/* COPY: address */}</p>
          </div>
          <div>
            <h2 className="mb-2 font-sans font-semibold text-text-primary">
              Email
            </h2>
            <p>{/* COPY: email */}</p>
          </div>
          <div>
            <h2 className="mb-2 font-sans font-semibold text-text-primary">
              Phone
            </h2>
            <p>{/* COPY: phone */}</p>
          </div>
          <div>
            <h2 className="mb-2 font-sans font-semibold text-text-primary">
              Social
            </h2>
            <p>{/* COPY: social links */}</p>
          </div>
        </div>
        <form className="glass-panel space-y-4 rounded-2xl p-6">
          <div>
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" />
          </div>
          <div>
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" />
          </div>
          <div>
            <Label htmlFor="contact-subject">Subject</Label>
            <Input id="contact-subject" />
          </div>
          <div>
            <Label htmlFor="contact-message">Message</Label>
            <Textarea id="contact-message" />
          </div>
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
}
