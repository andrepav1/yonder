// Tiny key-value seam. The game persists through this interface, so the
// localStorage adapter can later be swapped for a remote one (multiplayer /
// cross-device) without touching game logic. Also makes persistence testable
// with an in-memory adapter.

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** In-memory adapter — used in tests and as an SSR/no-storage fallback. */
export function memoryStore(seed: Record<string, string> = {}): KeyValueStore {
  const map = new Map<string, string>(Object.entries(seed))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

/** The real browser store, or a memory fallback when localStorage is unavailable. */
export function defaultStore(): KeyValueStore {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__yondle_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return localStorage
    }
  } catch {
    // localStorage can throw in private mode / when disabled — fall back.
  }
  return memoryStore()
}
