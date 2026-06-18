"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("Thanks! You're subscribed to Panther news.");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/pafa/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (data.message) setMessage(data.message);
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (submitted) {
    return (
      <p role="status" className="text-sm text-status-success">
        {message}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="footer-email" className="sr-only">
          Email address for newsletter
        </label>
        <input
          id="footer-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="h-10 min-w-0 flex-1 rounded-md border border-border-default bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-10 shrink-0 rounded-md bg-accent-blue px-4 text-sm font-medium text-white hover:shadow-glow-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? "…" : "Subscribe"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-status-danger">
          {error}
        </p>
      )}
    </div>
  );
}
