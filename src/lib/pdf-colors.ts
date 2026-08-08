// Shared colour math for generated PDFs (quotes, invoices) so brand colours
// stay legible regardless of which hex the business picks.

// Relative luminance (WCAG) to decide black or white text on a colored
// background.
export function contrastText(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

// Light tint of a brand colour, used for subtle backgrounds (table headers,
// zebra striping) that stay on-brand without competing with body text.
export function tint(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#f5f5f5";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
