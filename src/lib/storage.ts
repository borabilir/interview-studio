export const STORAGE_PREFIX = "interview-os";
export const LOCAL_STORAGE_EVENT = "interview-os:storage";

export function storageKey(key: string): string {
  return `${STORAGE_PREFIX}:${key}`;
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (value === null) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    return safeJsonParse<T>(window.localStorage.getItem(storageKey(key)), fallback);
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;

  try {
    const scopedKey = storageKey(key);
    window.localStorage.setItem(scopedKey, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key: scopedKey } }));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const scopedKey = storageKey(key);
    window.localStorage.removeItem(scopedKey);
    window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key: scopedKey } }));
    return true;
  } catch {
    return false;
  }
}

