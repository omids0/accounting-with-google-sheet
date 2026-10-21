import { describe, expect, it } from 'vitest'

import { createPageSpeedDialActions } from './pageSpeedDialActions'

const ids = (readOnly?: boolean) =>
  createPageSpeedDialActions({
    onAdd: () => undefined,
    onRefresh: () => undefined,
    onImport: () => undefined,
    onExport: () => undefined,
    readOnly
  }).map(action => action.id)

describe('createPageSpeedDialActions', () => {
  it('offers add and import by default', () => {
    expect(ids()).toContain('add')
    expect(ids()).toContain('import')
  })

  it('drops add and import for a role that may only read, keeping refresh and export', () => {
    expect(ids(true)).not.toContain('add')
    expect(ids(true)).not.toContain('import')
    expect(ids(true)).toEqual(expect.arrayContaining(['refresh', 'export']))
  })
})
