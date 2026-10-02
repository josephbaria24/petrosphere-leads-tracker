export function PetroMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="petro-mark-gold" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="45%" stopColor="#F5C400" />
          <stop offset="100%" stopColor="#E39B00" />
        </linearGradient>
      </defs>
      <path
        fill="url(#petro-mark-gold)"
        d="M32 2.5C32 2.5 7 34 7 51.5 7 66.1 18.2 77.5 32 77.5S57 66.1 57 51.5C57 34 32 2.5 32 2.5z"
      />
      <path
        fill="#fff6c2"
        opacity="0.45"
        d="M32 8c-7 10-14 22-16.5 32 6-3 12.2-4.5 16.5-4.5S42.5 37 48.5 40C46 30 39 18 32 8z"
      />
      <rect x="20.5" y="42" width="23" height="23" rx="2" fill="#1a1408" />
      <rect x="26.5" y="48" width="11" height="11" rx="1" fill="#F5C400" transform="rotate(45 32 53.5)" />
    </svg>
  )
}

export function PetroHeroMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 520" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="petro-hero-body" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#3a3a40" />
          <stop offset="42%" stopColor="#1c1c20" />
          <stop offset="100%" stopColor="#0a0a0c" />
        </linearGradient>
        <linearGradient id="petro-hero-facet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a4a52" />
          <stop offset="100%" stopColor="#16161a" />
        </linearGradient>
        <linearGradient id="petro-hero-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="100%" stopColor="#E39B00" />
        </linearGradient>
        <linearGradient id="petro-hero-edge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="40%" stopColor="#F5C400" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        fill="url(#petro-hero-body)"
        d="M210 18C210 18 48 214 48 332c0 96 72 164 162 164s162-68 162-164C372 214 210 18 210 18z"
      />
      <path
        fill="url(#petro-hero-facet)"
        d="M210 18C210 18 118 168 96 268c38-22 78-34 114-34s76 12 114 34C302 168 210 18 210 18z"
      />
      <path
        fill="url(#petro-hero-edge)"
        d="M210 36c-46 62-92 150-104 250 34-18 70-28 104-28s70 10 104 28C302 186 256 98 210 36z"
      />
      <path
        fill="#0c0c0e"
        d="M138 292h144v144H138z"
      />
      <path
        fill="none"
        stroke="#2a2a30"
        strokeWidth="6"
        d="M150 304h120v120H150z"
      />
      <rect x="186" y="340" width="48" height="48" fill="url(#petro-hero-gold)" transform="rotate(45 210 364)" />
      <path
        fill="#fff"
        opacity="0.18"
        d="M168 118c18-28 34-48 42-62 2 22 8 52 22 86-24 6-46 4-64-24z"
      />
    </svg>
  )
}
