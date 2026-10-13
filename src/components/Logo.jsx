// The HomeBase logo (same drawing as public/icon.svg), for screens shown before the household opens
export default function Logo({ size = 56, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`block ${className}`} aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#4E7A3A" />
      <rect x="28" y="24" width="14" height="52" rx="3" fill="#F6F2EA" />
      <rect x="58" y="24" width="14" height="52" rx="3" fill="#F6F2EA" />
      <rect x="42" y="44" width="16" height="12" fill="#C0703F" />
    </svg>
  )
}
