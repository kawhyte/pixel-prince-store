import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        {/* Doodle Easel SVG */}
        <svg
          viewBox="0 0 200 220"
          className="mx-auto mb-8 h-52 w-52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Easel upright post */}
          <line x1="100" y1="20" x2="100" y2="175" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" />
          {/* Easel left leg */}
          <line x1="100" y1="160" x2="55" y2="205" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" />
          {/* Easel right leg */}
          <line x1="100" y1="160" x2="145" y2="205" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" />
          {/* Easel cross brace */}
          <line x1="65" y1="188" x2="135" y2="188" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />

          {/* Canvas frame: slightly wobbly rect */}
          <path
            d="M42 28 Q43 26 58 26 L142 27 Q144 27 145 29 L146 120 Q145 122 143 122 L57 121 Q55 121 54 119 Z"
            stroke="#2a2a2a"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Canvas inner border */}
          <rect x="52" y="34" width="86" height="80" rx="2" stroke="#2a2a2a" strokeWidth="1.2" strokeDasharray="3 2" />

          {/* Sketchy "?" inside canvas */}
          <path
            d="M88 58 Q88 50 100 50 Q112 50 112 60 Q112 70 100 72 L100 80"
            stroke="#c2521f"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="100" cy="90" r="2.5" fill="#c2521f" />

          {/* Paint drip dots below canvas */}
          <circle cx="72" cy="132" r="3.5" stroke="#c2521f" strokeWidth="2" />
          <circle cx="100" cy="136" r="2.5" stroke="#2a2a2a" strokeWidth="2" />
          <circle cx="128" cy="130" r="3" stroke="#c2521f" strokeWidth="2" />
          {/* Drip tails */}
          <line x1="72" y1="135" x2="72" y2="143" stroke="#c2521f" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="128" y1="133" x2="128" y2="140" stroke="#c2521f" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <h1 className="mb-2 text-5xl font-bold text-charcoal">404</h1>
        <h2 className="mb-3 text-2xl font-semibold text-charcoal">
          You&apos;ve wandered off the map
        </h2>
        <p className="mb-8 text-soft-charcoal">
          This screen doesn&apos;t exist. There&apos;s a whole gallery of free
          prints one jump away.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/free-downloads"
            className="inline-block rounded-md bg-sage-500 px-6 py-2.5 font-sans text-sm font-semibold text-white transition-all hover:bg-sage-400 hover:shadow-md"
          >
            Browse the gallery
          </Link>
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
