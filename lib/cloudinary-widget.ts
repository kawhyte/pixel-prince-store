/**
 * Fetches Cloudinary's upload widget the moment someone actually wants to upload.
 *
 * The script used to sit in the root layout, so every visitor to every page paid for a
 * third-party request that only Studio's asset manager can use. It also made the storefront's
 * health depend on a CDN it has no other reason to touch: a page check failed outright when
 * upload-widget.cloudinary.com timed out.
 *
 * Loading it here means the request happens once, in Studio, on a click.
 */

export const CLOUDINARY_WIDGET_SRC = "https://upload-widget.cloudinary.com/global/all.js";

/** The in-flight or settled load, so a second click does not add a second script tag. */
let pending: Promise<NonNullable<Window["cloudinary"]>> | null = null;

export function loadCloudinaryWidget(): Promise<NonNullable<Window["cloudinary"]>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The Cloudinary widget needs a browser."));
  }
  if (window.cloudinary) return Promise.resolve(window.cloudinary);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const done = () => {
      if (window.cloudinary) resolve(window.cloudinary);
      else fail();
    };
    const fail = () => {
      // Drop the cached rejection so a later click can try again; a failed load is usually the
      // network rather than something permanent.
      pending = null;
      reject(new Error("Could not reach Cloudinary. Check your connection and try again."));
    };

    // A tag may already be on the page from an earlier click that is still in flight.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CLOUDINARY_WIDGET_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.src = CLOUDINARY_WIDGET_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return pending;
}

/** Test seam: forget any cached load. */
export function resetCloudinaryWidgetLoader() {
  pending = null;
}
