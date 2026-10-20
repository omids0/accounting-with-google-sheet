/**
 * The develop site is served from the production site's origin, so both would share
 * localStorage, sessionStorage and IndexedDB. A dev build gives every key and database
 * name this prefix, and never reads or writes production data.
 */
export const DEV_STORAGE_PREFIX = 'dev:'

/** A view of `base` that only sees, and only writes, keys under `prefix`. */
export function createPrefixedStorage(base: Storage, prefix: string): Storage {
  const keys = () => {
    const found: string[] = []

    for (let i = 0; i < base.length; i++) {
      const key = base.key(i)

      if (key?.startsWith(prefix)) found.push(key.slice(prefix.length))
    }

    return found
  }

  const view = {
    getItem: (key: string) => base.getItem(prefix + key),
    setItem: (key: string, value: string) => base.setItem(prefix + key, value),
    removeItem: (key: string) => base.removeItem(prefix + key),
    clear: () => keys().forEach(key => base.removeItem(prefix + key)),
    key: (index: number) => keys()[index] ?? null,
    get length() {
      return keys().length
    }
  }

  return view as unknown as Storage
}

/** An IndexedDB factory whose databases all live under `prefix`. */
export function createPrefixedIndexedDb(base: IDBFactory, prefix: string): IDBFactory {
  const factory = {
    open: (name: string, version?: number) => base.open(prefix + name, version),
    deleteDatabase: (name: string) => base.deleteDatabase(prefix + name),
    databases: async () =>
      (await base.databases())
        .filter(info => info.name?.startsWith(prefix))
        .map(info => ({ ...info, name: info.name?.slice(prefix.length) })),
    cmp: (first: unknown, second: unknown) => base.cmp(first, second)
  }

  return factory as unknown as IDBFactory
}

function replaceGlobal(
  target: Window,
  name: 'localStorage' | 'sessionStorage' | 'indexedDB',
  value: unknown
) {
  Object.defineProperty(target, name, { configurable: true, value })
}

/**
 * Must run before anything reads storage, so `main.tsx` imports it first. A browser
 * that refuses the override throws, so a dev build never runs on production data.
 */
export function isolateDevStorage(target: Window = window): void {
  replaceGlobal(
    target,
    'localStorage',
    createPrefixedStorage(target.localStorage, DEV_STORAGE_PREFIX)
  )
  replaceGlobal(
    target,
    'sessionStorage',
    createPrefixedStorage(target.sessionStorage, DEV_STORAGE_PREFIX)
  )

  if (target.indexedDB) {
    replaceGlobal(
      target,
      'indexedDB',
      createPrefixedIndexedDb(target.indexedDB, DEV_STORAGE_PREFIX)
    )
  }
}
