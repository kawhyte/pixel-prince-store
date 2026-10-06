"use client";

import { useEffect } from "react";

// Replaces the root layout when it fails, so no global CSS: inline styles only.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL-ERROR]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf8f4",
          color: "#2a2a2a",
          fontFamily: "system-ui, sans-serif",
          padding: 16,
        }}
      >
        <title>Something went wrong | The Pixel Prince</title>
        <div style={{ maxWidth: 420, textAlign: "center" }} role="alert">
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ marginBottom: 24, lineHeight: 1.5 }}>
            The Pixel Prince didn&apos;t load. It&apos;s usually a short hiccup, so give it another try.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "#c2521f",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              padding: "10px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
