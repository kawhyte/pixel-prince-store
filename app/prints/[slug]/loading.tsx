// Shown while a print page loads: the same two-column frame, so nothing jumps when it arrives.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading print">
      <div className="container mx-auto px-4 pt-5 sm:pt-6">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>
      <main className="container mx-auto px-4 pb-12 pt-5 lg:grid lg:grid-cols-[570px_minmax(0,640px)] lg:justify-center lg:items-start lg:gap-10 lg:pt-6">
        <div className="mx-auto aspect-[4/5] w-full max-w-[416px] animate-pulse rounded-md bg-muted sm:max-w-[480px] lg:max-w-none" />
        <div className="mt-6 space-y-4 lg:mt-0">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-3 gap-2 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
          <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </main>
    </div>
  );
}
