"use client";

import { useState } from "react";
import Button from "@/components/pafa/ui/Button";
import Input from "@/components/pafa/ui/Input";
import Label from "@/components/pafa/ui/Label";
import Textarea from "@/components/pafa/ui/Textarea";
import { Card, CardBody } from "@/components/pafa/ui/Card";
import { cn } from "@/lib/utils";

const STEPS = [
  "Player",
  "Parents",
  "Medical & consent",
  "Fees",
  "Review & pay",
] as const;

interface Props {
  program: string;
}

export default function RegisterFlow({ program }: Props) {
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <h1 className="text-display text-5xl">Register</h1>
      <p className="text-sm text-text-muted">{program}</p>

      <nav
        className="glass-panel-subtle flex flex-wrap items-center justify-center gap-2 rounded-full p-2"
        aria-label="Registration steps"
      >
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              i === step
                ? "text-accent-blue"
                : i < step
                  ? "text-text-secondary"
                  : "text-text-muted"
            )}
          >
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      <Card>
        <CardBody className="space-y-4">
          {step === 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" />
                </div>
                <div>
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" />
                </div>
              </div>
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" type="date" />
              </div>
              <div>
                <Label htmlFor="grade">Grade</Label>
                <Input id="grade" />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Input id="gender" />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-sans font-semibold text-text-primary">
                Primary parent
              </h2>
              <div>
                <Label htmlFor="parent-name">Name</Label>
                <Input id="parent-name" />
              </div>
              <div>
                <Label htmlFor="parent-email">Email</Label>
                <Input id="parent-email" type="email" />
              </div>
              <div>
                <Label htmlFor="parent-phone">Phone</Label>
                <Input id="parent-phone" type="tel" />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <Input id="relationship" />
              </div>
              <h2 className="pt-4 font-sans font-semibold text-text-primary">
                Secondary parent (optional)
              </h2>
              <div>
                <Label htmlFor="parent2-name">Name</Label>
                <Input id="parent2-name" />
              </div>
              <div>
                <Label htmlFor="parent2-email">Email</Label>
                <Input id="parent2-email" type="email" />
              </div>
              <div>
                <Label htmlFor="parent2-phone">Phone</Label>
                <Input id="parent2-phone" type="tel" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea id="allergies" />
              </div>
              <div>
                <Label htmlFor="doctor">Doctor info</Label>
                <Input id="doctor" />
              </div>
              <div>
                <Label htmlFor="emergency">Emergency contact</Label>
                <Input id="emergency" />
              </div>
              <label className="flex items-start gap-3 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-border-default focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                />
                <span>{/* COPY: waiver checkbox label */}</span>
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <Card variant="subtle">
                <CardBody className="space-y-2 font-mono tabular-nums text-text-secondary">
                  <div className="flex justify-between">
                    <span>Registration fee</span>
                    <span>--</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equipment fee</span>
                    <span>--</span>
                  </div>
                  <div className="flex justify-between border-t border-border-subtle pt-2 font-semibold text-text-primary">
                    <span>Total</span>
                    <span>--</span>
                  </div>
                </CardBody>
              </Card>
              <div>
                <Label htmlFor="promo">Promo code</Label>
                <Input id="promo" />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-text-secondary">
                {/* COPY: review summary intro */}
              </p>
              <Card variant="subtle">
                <CardBody className="space-y-2 text-sm text-text-secondary">
                  <p>{/* COPY: player summary */}</p>
                  <p>{/* COPY: parent summary */}</p>
                  <p>{/* COPY: medical summary */}</p>
                  <p className="font-mono tabular-nums">
                    Total: --
                  </p>
                </CardBody>
              </Card>
              <div className="rounded-lg border border-border-subtle p-4 text-sm text-text-secondary">
                {/* COPY: magic link auth block — to be implemented */}
              </div>
              <Button
                variant="primary"
                disabled
                data-todo="stripe-integration"
                className="w-full"
              >
                Proceed to payment
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={back}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" onClick={next}>
            Continue
          </Button>
        ) : null}
      </div>
    </div>
  );
}
