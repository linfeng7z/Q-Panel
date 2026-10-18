interface LogoProps {
  size?: number
}

export function Logo({ size = 17 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.7 3.6h-.5A2.6 2.6 0 0 0 5.6 6.2v11.6a2.6 2.6 0 0 0 2.6 2.6h8.6a2.6 2.6 0 0 0 2.6-2.6V6.2a2.6 2.6 0 0 0-2.6-2.6h-.5c-.3 1.5-1.64 2.6-3.3 2.6s-3-1.1-3.3-2.6Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
      <path
        d="m8.9 12.1 2.35 2.35L16.7 9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
