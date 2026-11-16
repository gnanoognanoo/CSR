/**
 * safeExternalUrl — sanitises user-supplied URLs before rendering as <a href>.
 * Returns the trimmed URL only when it starts with http:// or https://.
 * Returns null for empty input, javascript:, data:, or any other protocol.
 */
export function safeExternalUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
