// Small, dependency-free hex colour math -- just enough to derive a
// rotating avatar palette from a business's own primary/accent colours
// (business_settings) instead of a fixed unrelated set or plain grey.

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// Darken-only variants (never lighten) -- avatar initials are always white
// text, so every colour in the set needs to stay dark/saturated enough to
// keep that legible regardless of how light the business's own brand
// colours happen to be.
export function buildAvatarPalette(primary: string, accent: string): string[] {
  return [primary, accent, darken(primary, 0.3), darken(accent, 0.3)];
}

// Stable per-id hash so the same customer always gets the same colour
// across page loads and pagination, the same way contact apps colour a
// person consistently rather than reassigning it on every render.
export function pickAvatarColor(id: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}
