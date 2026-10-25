import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isStandardEntryForm, withStandardFields } from './fieldUtils'
import { isLinked, isSharedColumn, SHARED_LINK_FIELD_ID, withSharedLinkField } from './sharedFields'
import { drainSharedLinks } from '../../hooks/useSharedLinkDrain'
import { getDefaultSettings, getSettings, saveSettings } from '../../services/settings'
import {
  readSharedLinks,
  SHARED_CHOICE_KEY,
  SHARED_LINK_KEY,
  takeSharedChoice
} from '../../services/sharedLinkPrefs'
import { STORAGE_KEYS, setItem } from '../../services/storage'
import { isTickShown } from '../shared/sharedTickEntry'

const linkIn = (forms: { fields: { id: string }[] }[]) =>
  forms.map(form => form.fields.some(field => field.id === SHARED_LINK_FIELD_ID))

const settingsWith = (spreadsheets: { id: string; name: string; kind?: 'shared' }[]) => {
  setItem(STORAGE_KEYS.SETTINGS, {
    ...getDefaultSettings(),
    spreadsheetId: 'p',
    spreadsheets: spreadsheets.map(sheet => ({ ...sheet, createdAt: '' }))
  })
}

beforeEach(() => localStorage.clear())

describe('the personal link column «حساب مشترک»', () => {
  it('is added to income and expense only when on, last, and keeps the standard layout', () => {
    const forms = withSharedLinkField(withStandardFields(getDefaultSettings().forms), true)

    expect(linkIn(forms)).toEqual([true, true])
    expect(forms[0].fields.at(-1)?.id).toBe(SHARED_LINK_FIELD_ID)
    expect(isStandardEntryForm(forms[1])).toBe(true)
    expect(linkIn(withSharedLinkField(forms, false))).toEqual([false, false])
  })

  it('never reaches a user without a shared account', () => {
    settingsWith([{ id: 'p', name: 'حسابداری · من' }])

    expect(linkIn(getSettings()!.forms)).toEqual([false, false])
  })

  it('exists on the personal sheet once a shared account is registered, never on the shared one', () => {
    settingsWith([
      { id: 'p', name: 'حسابداری · من' },
      { id: 's', name: 'حسابداری · مشترک خانه', kind: 'shared' }
    ])

    expect(linkIn(getSettings()!.forms)).toEqual([true, true])

    saveSettings({ ...getSettings()!, spreadsheetId: 's' })

    expect(linkIn(getSettings()!.forms)).toEqual([false, false])
  })

  it('is hidden from the record screens and read as linked when it names a sheet', () => {
    expect(isSharedColumn(SHARED_LINK_FIELD_ID)).toBe(true)
    expect(isLinked({ [SHARED_LINK_FIELD_ID]: 's' })).toBe(true)
    expect(isLinked({ [SHARED_LINK_FIELD_ID]: '' })).toBe(false)
  })
})

describe('isTickShown', () => {
  it('hides the tick on a new vehicle expense, keeps it on a linked record turned «خودرو»', () => {
    settingsWith([
      { id: 'p', name: 'حسابداری · من' },
      { id: 's', name: 'حسابداری · مشترک خانه', kind: 'shared' }
    ])
    const expense = getSettings()!.forms.find(form => form.type === 'expense')!

    expect(isTickShown(expense, 'خوراک', '')).toBe(true)
    expect(isTickShown(expense, 'خودرو', '')).toBe(false)
    expect(isTickShown(expense, 'خودرو', 's')).toBe(true)
  })

  it('never shows for a user without a shared account', () => {
    settingsWith([{ id: 'p', name: 'حسابداری · من' }])

    expect(isTickShown(getSettings()!.forms[1], 'خوراک', '')).toBe(false)
  })
})

describe('drainSharedLinks', () => {
  it('lets failed copies go again once the shared account is open on this device', () => {
    settingsWith([{ id: 's', name: 'حسابداری · مشترک خانه', kind: 'shared' }])
    setItem(SHARED_LINK_KEY, [{ id: 't', recordId: 'r', ref: 'x', kind: 'delete', failed: 'no' }])
    vi.stubGlobal('navigator', { onLine: false })
    saveSettings({ ...getSettings()!, spreadsheetId: 's' })
    drainSharedLinks()

    expect(readSharedLinks()[0].failed).toBeUndefined()
    vi.unstubAllGlobals()
  })
})

describe('takeSharedChoice', () => {
  it('takes the tick answer out of the values, so it is never written', () => {
    const choice = { on: true, sharedId: 's', category: '', split: 'equal', payer: '' }
    const { values, choice: taken } = takeSharedChoice({
      title: 't',
      [SHARED_CHOICE_KEY]: JSON.stringify(choice)
    })

    expect(values).toEqual({ title: 't' })
    expect(taken).toEqual(choice)
    expect(takeSharedChoice({ title: 't' }).choice).toBeNull()
  })
})
