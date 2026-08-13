// Platform-level lockup ("Ralden") shown only on pre-login screens
// (login, signup, account-level password reset). Never used once a business
// is signed in -- authenticated pages use that business's own branding
// (logo_url / logo_light_url / logo_dark_url from business_settings).
export function PlatformLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 680 190" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="140" y="30" width="130" height="130" rx="28" fill="#EAB308" />
      <rect x="163" y="110" width="20" height="35" rx="6" fill="#292524" />
      <rect x="195" y="85" width="20" height="60" rx="6" fill="#292524" />
      <rect x="227" y="60" width="20" height="85" rx="6" fill="#292524" />
      <text
        x="300"
        y="112"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="56"
        fill="#292524"
      >
        Ralden
      </text>
    </svg>
  );
}
