"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { trackEmailSignup } from "@/lib/analytics";

interface EmailSignupFormProps {
  source: string;
  className?: string;
}

export default function EmailSignupForm({ source, className }: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent: true, source, website }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setPending(false);
        return;
      }

      setSuccess(true);
      trackEmailSignup(source);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  if (success) {
    return (
      <p className={`text-base font-medium text-charcoal ${className || ""}`}>
        Player 2 has entered your inbox. Watch for this month&apos;s free print.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className || ""}`}>
      <div className="flex h-12 w-full max-w-xl overflow-hidden rounded-full border border-border bg-card focus-within:border-sage-500 focus-within:ring-2 focus-within:ring-sage-200">
        <input
          type="email"
          name="email"
          autoComplete="email"
          aria-label="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-5 text-base text-charcoal outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-full shrink-0 bg-sage-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-sage-400 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get the free prints"}
        </button>
      </div>

      <label className="flex items-start gap-2 text-xs text-soft-charcoal">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-sage-500 focus:ring-sage-300"
        />
        <span>One email a month: a new free print + shop news. Unsubscribe anytime.</span>
      </label>

      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
