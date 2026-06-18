"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: connect to PAFA newsletter provider.
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <p role="status" className="text-sm text-status-success">
        Thanks! You&apos;re subscribed to Panther news.
      </p>
    );
  }

  return (
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
        className="h-10 shrink-0 rounded-md bg-accent-blue px-4 text-sm font-medium text-white hover:shadow-glow-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
      >
        Subscribe
      </button>
    </form>
  );
}
