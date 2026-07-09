export function Logo({ size = 40, rounded = true }: { size?: number; rounded?: boolean }) {
  const gradientId = 'logo-bg';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1B41A0" />
          <stop offset="1" stopColor="#091A47" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx={rounded ? 14 : 0} fill={`url(#${gradientId})`} />
      <rect x="23" y="27" width="18" height="12" rx="3" fill="#D99700" />
      <path d="M32 16 53 26 32 36 11 26 32 16Z" fill="#F7B500" />
      <circle cx="49" cy="24" r="3.4" fill="#FFFFFF" />
    </svg>
  );
}
