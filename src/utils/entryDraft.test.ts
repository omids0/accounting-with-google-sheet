import { afterEach, describe, expect, it } from 'vitest'

import {
  changedEntryValues,
  clearAllEntryDrafts,
  clearEntryDraft,
  ENTRY_DRAFT_TTL_MS,
  loadEntryDraft,
  parseEntryDraft,
  saveEntryDraft
} from './entryDraft'

const initial = { date: '2026-10-24', title: '', category: 'خوراک', amount: '' }
const ids = Object.keys(initial)
const NOW = 1_000_000_000_000

afterEach(() => sessionStorage.clear())

describe('changedEntryValues', () => {
  it('keeps only the fields that differ from the starting values', () => {
    expect(changedEntryValues({ ...initial, title: 'نان', amount: 5000 }, initial)).toEqual({
      title: 'نان',
      amount: 5000
    })
  })

  it('treats blank text as untouched', () => {
    expect(changedEntryValues({ ...initial, title: '   ' }, initial)).toEqual({})
  })
})

describe('saveEntryDraft / loadEntryDraft', () => {
  it('round-trips the changed fields only', () => {
    saveEntryDraft('expense', { ...initial, title: 'نان', amount: '5000' }, initial, NOW)

    expect(loadEntryDraft('expense', ids, NOW + 1000)).toEqual({ title: 'نان', amount: '5000' })
  })

  it('stores nothing while every field is at its starting value', () => {
    saveEntryDraft('expense', initial, initial, NOW)

    expect(sessionStorage.length).toBe(0)
  })

  it('drops an earlier draft once the user erases everything', () => {
    saveEntryDraft('expense', { ...initial, title: 'نان' }, initial, NOW)
    saveEntryDraft('expense', initial, initial, NOW + 1)

    expect(loadEntryDraft('expense', ids, NOW + 2)).toBeNull()
  })

  it('keeps one draft per form', () => {
    saveEntryDraft('expense', { ...initial, title: 'نان' }, initial, NOW)

    expect(loadEntryDraft('income', ids, NOW)).toBeNull()
  })

  it('clears one draft or all of them', () => {
    saveEntryDraft('expense', { ...initial, title: 'a' }, initial, NOW)
    saveEntryDraft('income', { ...initial, title: 'b' }, initial, NOW)
    clearEntryDraft('expense')
    expect(loadEntryDraft('expense', ids, NOW)).toBeNull()
    expect(loadEntryDraft('income', ids, NOW)).not.toBeNull()
    clearAllEntryDrafts()
    expect(loadEntryDraft('income', ids, NOW)).toBeNull()
  })
})

describe('parseEntryDraft', () => {
  const stored = (savedAt: number, values: unknown) => JSON.stringify({ savedAt, values })

  it('expires after 24 hours', () => {
    const raw = stored(NOW, { title: 'x' })

    expect(parseEntryDraft(raw, ids, NOW + ENTRY_DRAFT_TTL_MS)).toEqual({ title: 'x' })
    expect(parseEntryDraft(raw, ids, NOW + ENTRY_DRAFT_TTL_MS + 1)).toBeNull()
  })

  it('ignores unknown fields, odd value types and broken JSON', () => {
    expect(
      parseEntryDraft(stored(NOW, { title: 'x', gone: 'y', note: { a: 1 } }), ids, NOW)
    ).toEqual({ title: 'x' })
    expect(parseEntryDraft(stored(NOW, { gone: 'y' }), ids, NOW)).toBeNull()
    expect(parseEntryDraft('{oops', ids, NOW)).toBeNull()
    expect(parseEntryDraft(null, ids, NOW)).toBeNull()
  })
})
