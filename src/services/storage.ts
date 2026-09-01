const STORAGE_KEYS = {
  SESSION: 'accounting_session',
  SETTINGS: 'accounting_settings',
  APP_LOCK: 'accounting_app_lock',
  APP_LOCK_DEVICE: 'accounting_app_lock_device',
} as const;

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

export { STORAGE_KEYS };
