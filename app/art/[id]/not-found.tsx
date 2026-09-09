import Link from "next/link";

export default function ArtNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        {/* Doodle Spilled Paint Jar SVG */}
        <svg
          viewBox="0 0 200 200"
          className="mx-auto mb-8 h-52 w-52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Jar body */}
          <path
            d="M70 60 Q68 58 72 56 L128 56 Q132 58 130 60 L134 130 Q134 136 128 138 L72 138 Q66 136 66 130 Z"
            stroke="#2a2a2a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Jar lid */}
          <rect x="66" y="48" width="68" height="10" rx="4" stroke="#2a2a2a" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Brush in jar */}
          <line x1="118" y1="48" x2="136" y2="20" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M134 18 Q138 14 140 18 Q138 24 134 22 Z" stroke="#c2521f" strokeWidth="2" strokeLinejoin="round" />

          {/* Spilled paint pool: tilted jar */}
          <path
            d="M40 148 Q35 160 50 165 Q80 172 130 168 Q155 165 152 155 Q148 145 120 143 Q80 140 60 145 Z"
            stroke="#c2521f"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Spill drips */}
          <line x1="75" y1="168" x2="72" y2="178" stroke="#c2521f" strokeWidth="2" strokeLinecap="round" />
          <line x1="100" y1="170" x2="100" y2="182" stroke="#c2521f" strokeWidth="2" strokeLinecap="round" />
          <line x1="125" y1="167" x2="128" y2="177" stroke="#c2521f" strokeWidth="2" strokeLinecap="round" />

          {/* Stray doodle marks suggesting emptiness */}
          <path d="M155 80 Q160 75 165 80 Q170 85 165 90" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M30 90 Q35 85 38 92" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="158" y1="50" x2="168" y2="44" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="162" y1="50" x2="172" y2="56" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <h1 className="mb-2 text-5xl font-bold text-charcoal">404</h1>
        <h2 className="mb-3 text-2xl font-semibold text-charcoal">
          We couldn&apos;t find this piece
        </h2>
        <p className="mb-8 text-soft-charcoal">
          This artwork may have moved or been removed from the gallery.
        </p>
        <Link
          href="/free-downloads"
          className="inline-block rounded-2xl bg-sage-500 px-6 py-2.5 font-sans text-sm font-semibold text-white transition-all hover:bg-sage-400 hover:shadow-md"
        >
          Back to Gallery
        </Link>
      </div>
    </div>
  );
}
