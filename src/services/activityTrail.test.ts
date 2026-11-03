import { describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'

vi.mock('./auth', () => ({ getUserEmail: () => 'me@example.com', getUserName: () => 'امید' }))

const { activityToRow, buildActivityEntry, rowToActivity } = await import('./activityLog')
const { deleteTrail, editTrail, parseTrail } = await import('./activityTrail')
const { TRAIL_VALUE_MAX } = await import('./activityTrailModel')
const { revertKindOf, revertOffered } = await import('./activityTrailRevert')
const { ACTIVITY_LOG_HEADERS } = await import('./sheetHeaders')

const FORM: CustomForm = {
  id: 'f1',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: [
    { id: 'amount', label: 'مبلغ', type: 'number', required: true },
    { id: 'note', label: 'یادداشت', type: 'text', required: false },
    { id: 'pin', label: 'رمز', type: 'text', required: false },
    { id: 'shopping', label: 'خرید', type: 'text', required: false }
  ]
}

const entryOf = (cells: ReturnType<typeof editTrail>, over: object = {}) => ({
  id: 'log1',
  action: 'update',
  module: 'records',
  itemId: 'r1',
  email: 'me@example.com',
  ...cells,
  ...over
})

const allowed = { reverted: new Set<string>(), me: 'me@example.com', may: () => true }

describe('trail cells', () => {
  it('keeps only the changed fields of an edit', () => {
    const cells = editTrail(FORM, { amount: '100', note: 'a' }, { amount: 250, note: 'a' })

    expect(JSON.parse(cells.before)).toEqual({ amount: '100' })
    expect(JSON.parse(cells.after)).toEqual({ amount: '250' })
    expect(parseTrail(cells)).toMatchObject({ formId: 'f1', cut: false, revertOf: '' })
  })

  it('treats 100 and "100.0" or a spaced copy as the same, so a re-save logs nothing', () => {
    expect(
      editTrail(FORM, { amount: '100', note: 'a' }, { amount: '100.0', note: ' a ' }).before
    ).toBe('')
  })

  it('cuts a long note and marks the row so it is never offered for revert', () => {
    const note = 'ی'.repeat(TRAIL_VALUE_MAX + 50)
    const cells = editTrail(FORM, { note: '' }, { note })
    const trail = parseTrail(cells)!

    expect(trail.after.note.length).toBe(TRAIL_VALUE_MAX + 1)
    expect(trail.cut).toBe(true)
    expect(revertKindOf(entryOf(cells))).toBeNull()
    expect(revertOffered(entryOf(cells), allowed)).toBe(false)
  })

  it('never carries a secret field, and a change to one blocks the revert', () => {
    const cells = editTrail(FORM, { amount: '1', pin: '1234' }, { amount: '2', pin: '9999' })

    expect(cells.before + cells.after).not.toMatch(/1234|9999/)
    expect(parseTrail(cells)!.cut).toBe(true)
    // «shopping» only contains the letters "pin": it is an ordinary field.
    expect(editTrail(FORM, { shopping: 'a' }, { shopping: 'b' }).before).toContain('shopping')
    expect(deleteTrail(FORM, { amount: '5', pin: '1234' }).before).not.toContain('1234')
  })

  it('stores the full record of a delete, without its empty fields', () => {
    const cells = deleteTrail(FORM, { amount: '5', note: '', shopping: 'نان' })

    expect(JSON.parse(cells.before)).toEqual({ amount: '5', shopping: 'نان' })
    expect(cells.after).toBe('')
    expect(revertKindOf(entryOf(cells, { action: 'delete' }))?.kind).toBe('delete')
  })

  it('leaves no trail for a change that does not fit a cell', () => {
    const wide = {
      ...FORM,
      fields: Array.from({ length: 40 }, (_, i) => ({ ...FORM.fields[1], id: `f${i}` }))
    }
    const values = Object.fromEntries(
      wide.fields.map(field => [field.id, 'x'.repeat(TRAIL_VALUE_MAX)])
    )

    expect(deleteTrail(wide, values).before).toBe('')
  })
})

describe('old rows and permissions', () => {
  it('reads a nine-column row from before the trail, with no revert data', () => {
    const old = ['a', '2026-10-01T00:00:00Z', 'x@y', 'X', 'update', 'records', 'r1', 's', 'Android']
    const entry = rowToActivity(old)!

    expect(entry).toMatchObject({ before: '', after: '', version: '' })
    expect(parseTrail(entry)).toBeNull()
    expect(revertOffered({ ...entry, email: 'x@y' }, allowed)).toBe(false)
  })

  it('writes every row as long as the header, empty trail cells included', () => {
    const entry = buildActivityEntry({
      action: 'create',
      module: 'records',
      itemId: 'r',
      summary: 's'
    })!

    expect(activityToRow(entry)).toHaveLength(ACTIVITY_LOG_HEADERS.length)
    expect(ACTIVITY_LOG_HEADERS.slice(-3)).toEqual(['قبل', 'بعد', 'نسخه'])
    expect(ACTIVITY_LOG_HEADERS).toHaveLength(12)
  })

  it('ignores a trail it cannot read or a format from the future', () => {
    expect(parseTrail({ before: '{', after: '{}', version: 'v1;form=f1' })?.cut).toBe(true)
    expect(parseTrail({ before: '{}', after: '{}', version: 'v9;form=f1' })).toBeNull()
  })

  it("offers no button to a viewer, to a partner on another one's row, or twice", () => {
    const cells = editTrail(FORM, { amount: '1' }, { amount: '2' })
    const mine = entryOf(cells)
    const theirs = entryOf(cells, { email: 'other@example.com' })

    expect(revertOffered(mine, allowed)).toBe(true)
    expect(revertOffered(mine, { ...allowed, may: () => false })).toBe(false)
    expect(revertOffered(theirs, { ...allowed, may: p => p === 'record' })).toBe(false)
    expect(revertOffered(theirs, allowed)).toBe(true)
    expect(revertOffered(mine, { ...allowed, reverted: new Set(['log1']) })).toBe(false)
  })

  it('never offers a «بازگردانی شد» row itself', () => {
    const cells = editTrail(FORM, { amount: '2' }, { amount: '1' }, 'log1')

    expect(revertOffered(entryOf(cells, { action: 'revert' }), allowed)).toBe(false)
    expect(revertOffered(entryOf(cells, { action: 'update' }), allowed)).toBe(false)
  })
})
