import { randomBytes } from "crypto";

// Cryptographically random, URL-safe, unguessable (192 bits of entropy) --
// used for public share links where the token itself is the only access
// control (see quote_public_tokens).
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}
