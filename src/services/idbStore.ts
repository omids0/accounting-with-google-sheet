/**
 * A single IndexedDB object store with promise helpers. Every failure resolves
 * to null instead of throwing: callers treat the database as a cache.
 */
export interface IdbStore {
  get<T>(key: IDBValidKey): Promise<T | null>
  getAll<T>(): Promise<T[]>
  put(value: unknown, key?: IDBValidKey): Promise<boolean>
  delete(key: IDBValidKey): Promise<void>
  /** Closes the cached connection and drops the whole database. */
  deleteDatabase(): Promise<void>
}

interface IdbStoreOptions {
  dbName: string
  storeName: string
  /** In-line key path; omit for out-of-line keys passed to `put`. */
  keyPath?: string
}

export function createIdbStore({ dbName, storeName, keyPath }: IdbStoreOptions): IdbStore {
  let dbPromise: Promise<IDBDatabase | null> | null = null

  function openDb(): Promise<IDBDatabase | null> {
    if (dbPromise) return dbPromise

    dbPromise = new Promise<IDBDatabase | null>(resolve => {
      if (typeof indexedDB === 'undefined') {
        resolve(null)

        return
      }

      try {
        const request = indexedDB.open(dbName, 1)

        request.onupgradeneeded = () => {
          const db = request.result

          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, keyPath ? { keyPath } : undefined)
          }
        }

        request.onsuccess = () => {
          const db = request.result

          // Let a sign-out in another tab delete the database instead of blocking it.
          db.onversionchange = () => {
            db.close()
            dbPromise = null
          }
          resolve(db)
        }
        request.onerror = () => resolve(null)
        request.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    })

    return dbPromise
  }

  function run<T>(
    mode: IDBTransactionMode,
    build: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T | null> {
    return openDb().then(db => {
      if (!db) return null

      return new Promise<T | null>(resolve => {
        try {
          const tx = db.transaction(storeName, mode)

          const request = build(tx.objectStore(storeName))

          request.onsuccess = () => resolve(request.result ?? null)
          request.onerror = () => resolve(null)
          tx.onabort = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
    })
  }

  return {
    get: <T>(key: IDBValidKey) => run<T>('readonly', store => store.get(key)),
    getAll: async <T>() => (await run<T[]>('readonly', store => store.getAll())) ?? [],
    put: async (value, key) => (await run('readwrite', store => store.put(value, key))) !== null,
    delete: async key => {
      await run('readwrite', store => store.delete(key))
    },
    deleteDatabase: async () => {
      const pending = dbPromise

      dbPromise = null

      const db = pending ? await pending : null

      db?.close()

      if (typeof indexedDB === 'undefined') return

      await new Promise<void>(resolve => {
        try {
          const request = indexedDB.deleteDatabase(dbName)

          request.onsuccess = () => resolve()
          request.onerror = () => resolve()
          // Another tab still holds a connection; the delete completes once it closes.
          request.onblocked = () => resolve()
        } catch {
          resolve()
        }
      })
    }
  }
}
