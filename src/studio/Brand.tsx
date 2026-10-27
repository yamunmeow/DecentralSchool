/**
 * The DecentralSchool mark: a roof over three linked points, a school made of a
 * network of people rather than one building. The same drawing is public/logo.svg
 * and the app icons.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="logo-mark">
      <rect width="48" height="48" rx="14" fill="#ffd447" />
      <path d="M9.5 22.5L24 11l14.5 11.5" fill="none" stroke="#5a3d06" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 34.5L24 25.5l8.5 9h-17" fill="none" stroke="#5a3d06" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="24" cy="25.5" r="4" fill="#ff8b97" stroke="#5a3d06" strokeWidth="2.2" />
      <circle cx="15.5" cy="34.5" r="3.6" fill="#fff" stroke="#5a3d06" strokeWidth="2" />
      <circle cx="32.5" cy="34.5" r="3.6" fill="#fff" stroke="#5a3d06" strokeWidth="2" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      Decentral<b>School</b>
    </span>
  );
}
