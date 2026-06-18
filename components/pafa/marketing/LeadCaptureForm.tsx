"use client";

import { CheckCircle2, Mail } from "lucide-react";
import { useState } from "react";
import Button from "@/components/pafa/ui/Button";
import { PROGRAMS } from "@/lib/pafa/constants";

export default function LeadCaptureForm() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // The async network call runs off the event handler's critical path, so the
    // interaction stays well under the INP budget; UI updates drive feedback.
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/pafa/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, program, source: "season-guide" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setMessage(data.message ?? "You're on the list!");
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="lead-heading" className="scroll-mt-24">
      <div className="glass-panel-strong grid items-center gap-8 rounded-2xl p-8 md:grid-cols-[1.1fr_1fr] md:p-12">
        <div>
          <p className="mb-2 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Not Ready to Commit?
          </p>
          <h2 id="lead-heading" className="text-display text-3xl md:text-4xl">
            Get the 2026 Season Guide
          </h2>
          <p className="mt-3 max-w-md text-text-secondary">
            Dates, costs, what to expect, and how to register — sent straight to your
            inbox. No spam, just Panther info.
          </p>
        </div>

        {submitted ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-status-success/30 bg-status-success/10 p-6"
          >
            <CheckCircle2 className="size-8 shrink-0 text-status-success" aria-hidden="true" />
            <p className="text-text-primary">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="lead-email" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Parent email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <input
                  id="lead-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-md border border-border-default bg-bg-elevated pr-3 pl-10 text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                />
              </div>
            </div>

            <div>
              <label htmlFor="lead-program" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Program of interest
              </label>
              <select
                id="lead-program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="h-12 w-full rounded-md border border-border-default bg-bg-elevated px-3 text-text-primary focus:border-accent-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
              >
                <option value="">Select a program…</option>
                {PROGRAMS.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} ({p.grades})
                  </option>
                ))}
                <option value="undecided">Not sure yet</option>
              </select>
            </div>

            {error && (
              <p role="alert" className="text-sm text-status-danger">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Sending…" : "Send Me the Guide"}
            </Button>
            <p className="text-xs text-text-muted">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
