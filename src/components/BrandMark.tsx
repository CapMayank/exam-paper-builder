/** Product mark: a right angle with its arc, drawn like a teacher's margin note. */
export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden className={className}>
      <rect width="36" height="36" rx="9" fill="#fcd34d" />
      <path d="M10 8v18h18" stroke="#0d2d38" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18c4.4 0 8 3.6 8 8" stroke="#0d2d38" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 4" />
      <rect x="10" y="22" width="4" height="4" fill="#0d2d38" />
    </svg>
  );
}
