// Platform-level lockup ("Tradeline") shown only on pre-login screens
// (login, signup, account-level password reset). Never used once a business
// is signed in -- authenticated pages use that business's own branding
// (logo_url / logo_light_url / logo_dark_url from business_settings).
export function PlatformLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 680 190" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="140" y="30" width="130" height="130" rx="28" fill="#1E293B" />
      <line x1="165" y1="95" x2="245" y2="95" stroke="#14B8A6" strokeWidth="5" />
      <circle cx="165" cy="95" r="10" fill="#14B8A6" />
      <circle cx="205" cy="95" r="10" fill="#14B8A6" />
      <circle cx="245" cy="95" r="10" fill="#14B8A6" />
      <text
        x="300"
        y="112"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="56"
        fill="#1E293B"
      >
        Tradeline
      </text>
    </svg>
  );
}
