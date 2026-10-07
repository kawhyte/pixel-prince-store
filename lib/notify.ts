/**
 * Toasts without shipping sonner to every visitor. Sonner (~33 KB) and its <Toaster> load the
 * first time a message is shown (components/common/LazyToaster.tsx); until then a page carries
 * none of it. Browser only.
 */
type Sonner = typeof import("sonner");

let requested = false;
let loading: Promise<Sonner> | null = null;
let markMounted: () => void = () => {};
const mounted = new Promise<void>((resolve) => {
  markMounted = resolve;
});
const listeners = new Set<() => void>();

/** For LazyToaster: has anything asked for a toast yet? */
export function toasterRequested(): boolean {
  return requested;
}

export function subscribeToaster(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** LazyToaster calls this once <Toaster> is listening; a toast fired earlier would be lost. */
export function toasterMounted(): void {
  markMounted();
}

function loadToaster(): Promise<Sonner> {
  if (!loading) {
    requested = true;
    listeners.forEach((l) => l());
    loading = import("sonner").then(async (sonner) => {
      await mounted;
      return sonner;
    });
  }
  return loading;
}

export function notifyError(title: string, description?: string): void {
  loadToaster()
    .then(({ toast }) => toast.error(title, description ? { description } : undefined))
    .catch((error) => console.error("[NOTIFY]", title, error));
}
