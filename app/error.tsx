"use client";

import { useEffect } from "react";
import Link from "next/link";

// Shown inside the site chrome when a page fails to render (usually Sanity being unreachable).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[PAGE-ERROR]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-cream px-4 py-16">
      <div className="max-w-md text-center" role="alert">
        <h1 className="mb-3 text-3xl font-bold text-charcoal">Something went wrong</h1>
        <p className="mb-8 text-soft-charcoal">
          This page didn&apos;t load. It&apos;s usually a short hiccup, so give it another try.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-block rounded-md bg-sage-500 px-6 py-2.5 font-sans text-sm font-semibold text-white transition-all hover:bg-sage-400 hover:shadow-md"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-block rounded-md border border-charcoal px-6 py-2.5 font-sans text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-cream"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
