// Per-viewer "recently opened" list. Browser-local convenience only; it never
// carries loan data beyond a number and a display label.
const KEY = "gfhub.recent.v1";
const LIMIT = 8;

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const write = (entries) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, LIMIT)));
  } catch {
    // Storage may be unavailable. Recents are a convenience, not a record.
  }
};

export function listRecent(profileId) {
  return read().filter((entry) => entry.profile === profileId);
}

export function rememberRecent(profileId, entry) {
  if (!profileId || !entry?.to) return;
  const next = [
    { ...entry, profile: profileId, at: new Date().toISOString() },
    ...read().filter(
      (existing) => !(existing.profile === profileId && existing.to === entry.to),
    ),
  ];
  write(next);
}

export function clearRecent(profileId) {
  write(read().filter((entry) => entry.profile !== profileId));
}
