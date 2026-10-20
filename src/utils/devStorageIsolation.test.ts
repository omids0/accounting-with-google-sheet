import { describe, expect, it } from 'vitest'

import {
  createPrefixedIndexedDb,
  createPrefixedStorage,
  DEV_STORAGE_PREFIX,
  isolateDevStorage
} from './devStorageIsolation'

function memoryStorage(): Storage {
  const data = new Map<string, string>()

  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: key => void data.delete(key),
    clear: () => data.clear(),
    key: index => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    }
  } as Storage
}

describe('createPrefixedStorage', () => {
  it('writes under the prefix and leaves production keys alone', () => {
    const base = memoryStorage()
    const view = createPrefixedStorage(base, DEV_STORAGE_PREFIX)

    base.setItem('accounting_settings', 'prod')
    view.setItem('accounting_settings', 'dev')

    expect(base.getItem('accounting_settings')).toBe('prod')
    expect(base.getItem('dev:accounting_settings')).toBe('dev')
    expect(view.getItem('accounting_settings')).toBe('dev')
  })

  it('does not see production keys', () => {
    const base = memoryStorage()
    const view = createPrefixedStorage(base, DEV_STORAGE_PREFIX)

    base.setItem('accounting_settings', 'prod')

    expect(view.getItem('accounting_settings')).toBeNull()
    expect(view.length).toBe(0)
    expect(view.key(0)).toBeNull()
  })

  it('lists and removes only its own keys', () => {
    const base = memoryStorage()
    const view = createPrefixedStorage(base, DEV_STORAGE_PREFIX)

    base.setItem('prod-key', '1')
    view.setItem('a', '1')
    view.setItem('b', '2')

    expect(view.length).toBe(2)
    expect([view.key(0), view.key(1)]).toEqual(['a', 'b'])

    view.removeItem('a')
    expect(base.getItem('dev:a')).toBeNull()

    view.clear()
    expect(base.getItem('prod-key')).toBe('1')
    expect(base.length).toBe(1)
  })
})

describe('isolateDevStorage', () => {
  it('replaces the storage globals with prefixed views', () => {
    const local = memoryStorage()
    const session = memoryStorage()
    const target = { localStorage: local, sessionStorage: session } as unknown as Window

    local.setItem('accounting_settings', 'prod')
    isolateDevStorage(target)
    target.localStorage.setItem('accounting_settings', 'dev')
    target.sessionStorage.setItem('lock', '1')

    expect(local.getItem('accounting_settings')).toBe('prod')
    expect(local.getItem('dev:accounting_settings')).toBe('dev')
    expect(session.getItem('dev:lock')).toBe('1')
  })
})

describe('createPrefixedIndexedDb', () => {
  it('opens, deletes and lists databases under the prefix', async () => {
    const opened: string[] = []
    const deleted: string[] = []
    const base = {
      open: (name: string) => void opened.push(name),
      deleteDatabase: (name: string) => void deleted.push(name),
      databases: async () => [
        { name: 'dev:sheets', version: 1 },
        { name: 'sheets', version: 1 }
      ],
      cmp: () => 0
    } as unknown as IDBFactory
    const view = createPrefixedIndexedDb(base, DEV_STORAGE_PREFIX)

    view.open('sheets', 1)
    view.deleteDatabase('sheets')

    expect(opened).toEqual(['dev:sheets'])
    expect(deleted).toEqual(['dev:sheets'])
    expect(await view.databases()).toEqual([{ name: 'sheets', version: 1 }])
  })
})
