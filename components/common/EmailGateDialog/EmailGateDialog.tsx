"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PixelIcon from "@/components/common/PixelIcon/PixelIcon";
import { triggerConfetti } from "@/lib/confetti";
import { notifyError } from "@/lib/notify";
import { trackEmailSignup, trackDownloadClaimed } from "@/lib/analytics";

interface EmailGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artId: string;
  artTitle: string;
}

const EMAIL_STORAGE_KEY = "pp_email";

export default function EmailGateDialog({
  open,
  onOpenChange,
  artId,
  artTitle,
}: EmailGateDialogProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      const savedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);
      if (savedEmail) setEmail(savedEmail);
      setError(null);
      setSuccess(false);
      setWebsite("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/request-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, artId, consent: true, website }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setPending(false);
        return;
      }

      localStorage.setItem(EMAIL_STORAGE_KEY, email);
      setSuccess(true);
      triggerConfetti();
      trackEmailSignup(`art/${artId}`);
      trackDownloadClaimed(artId);
    } catch {
      notifyError("Network error", "Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent
        className="rounded-md bg-card sm:max-w-md"
        onInteractOutside={(e) => pending && e.preventDefault()}
      >
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-100">
              <CheckCircle2 className="h-8 w-8 text-sage-600" />
            </div>
            <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-charcoal">
              <PixelIcon name="star" size={18} className="text-sage-500" />
              Player 2 has entered your inbox.
            </h2>
            <p className="text-sm text-soft-charcoal">
              We sent &quot;{artTitle}&quot; to {email}. The link works
              for 72 hours. (Check spam the first time.)
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="mt-2 w-full rounded-md bg-sage-500 hover:bg-sage-400"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-charcoal">
                Get your free print
              </DialogTitle>
              <DialogDescription>
                {artTitle}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-charcoal">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-md border border-border bg-background pl-9 pr-3 text-base text-charcoal outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-soft-charcoal">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-sage-500 focus:ring-sage-300"
                />
                <span>
                  Email me this print + one new free print every month. Unsubscribe
                  anytime.
                </span>
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

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={pending}
                className="h-12 w-full rounded-md bg-sage-500 text-base font-semibold hover:bg-sage-400 disabled:opacity-50"
                size="lg"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2">Sending…</span>
                  </>
                ) : (
                  "Send my download link"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
