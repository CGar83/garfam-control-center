const googleCalendarEmbedOrigin = "https://calendar.google.com";
const googleCalendarEmbedPath = "/calendar/embed";
const defaultEmbedHeight = 640;
const minEmbedHeight = 420;
const maxEmbedHeight = 1200;

function decodeHtmlEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
}

export function extractGoogleCalendarEmbedUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const htmlLike = trimmed.includes("<") && trimmed.includes(">");
  const quotedSrc = htmlLike ? trimmed.match(/\bsrc=(["'])(.*?)\1/i) : null;
  const unquotedSrc = htmlLike ? trimmed.match(/\bsrc=([^\s>]+)/i) : null;
  const rawValue = quotedSrc?.[2] ?? unquotedSrc?.[1] ?? trimmed;

  try {
    const url = new URL(decodeHtmlEntities(rawValue));
    if (url.origin !== googleCalendarEmbedOrigin || url.pathname !== googleCalendarEmbedPath) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isGoogleCalendarEmbedUrl(value?: string | null) {
  if (!value) return true;
  return extractGoogleCalendarEmbedUrl(value) !== null;
}

export function normalizeCalendarEmbedHeight(value?: number | null) {
  if (!Number.isFinite(value)) return defaultEmbedHeight;
  return Math.min(maxEmbedHeight, Math.max(minEmbedHeight, Math.round(Number(value))));
}
