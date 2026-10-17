interface LogoProps {
  size?: number
}

export function Logo({ size = 17 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5.2" y="5.2" width="13.4" height="13.4" rx="4.1" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M14.7 14.7L18.2 18.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}
