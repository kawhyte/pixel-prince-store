"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";

import { subscribeToaster, toasterMounted, toasterRequested } from "@/lib/notify";

// The wrapper's effect runs after sonner's own, so the toaster is listening when it reports in.
const Toaster = dynamic(
  () =>
    import("@/components/ui/sonner").then(({ Toaster: SonnerToaster }) => {
      function ReadyToaster() {
        useEffect(toasterMounted, []);
        return <SonnerToaster />;
      }
      return ReadyToaster;
    }),
  { ssr: false },
);

/** Mounts the toaster the first time lib/notify.ts is asked to show something. */
export default function LazyToaster() {
  const requested = useSyncExternalStore(subscribeToaster, toasterRequested, () => false);
  return requested ? <Toaster /> : null;
}
