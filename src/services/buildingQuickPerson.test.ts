import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createQuickPerson, quickPersonError } from './buildingQuickPerson'
import { applyPersonInput, blankPerson } from './personInput'

const created: unknown[] = []

vi.mock('./counterparties', () => ({
  createCounterparty: async (_id: string, data: object) => {
    const item = { id: 'p1', createdAt: 't', ...data }

    created.push(item)

    return item
  },
  getCounterpartyFullName: (p: { firstName: string; lastName: string }) =>
    `${p.firstName} ${p.lastName}`.trim()
}))

describe('quick add of a person in a building', () => {
  beforeEach(() => {
    created.length = 0
  })

  it('asks for a name and nothing else', () => {
    expect(quickPersonError({ name: '' })).toBeTruthy()
    expect(quickPersonError({ name: '   ' })).toBeTruthy()
    expect(quickPersonError({ name: 'احمدی' })).toBeNull()
    expect(quickPersonError({ name: 'علی احمدی', phone: '', card: '' })).toBeNull()
  })

  it('accepts no card or a whole one, never a half one', () => {
    expect(quickPersonError({ name: 'علی', card: '' })).toBeNull()
    expect(quickPersonError({ name: 'علی', card: '6104 3378 1234 5678' })).toBeNull()
    expect(quickPersonError({ name: 'علی', card: '۶۱۰۴۳۳۷۸۱۲۳۴۵۶۷۸' })).toBeNull()
    expect(quickPersonError({ name: 'علی', card: '6104' })).toBeTruthy()
  })

  it('stores the full name the way the setup journey does', async () => {
    const person = await createQuickPerson('b1', { name: 'علی رضا احمدی', phone: '۰۹۱۲۳۴۵۶۷۸۹' })

    const viaJourney = applyPersonInput(blankPerson(), {
      name: 'علی رضا احمدی',
      phone: '۰۹۱۲۳۴۵۶۷۸۹',
      card: ''
    })

    expect(person).toMatchObject({
      firstName: 'علی رضا',
      lastName: 'احمدی',
      placeholder: false,
      phones: [{ number: '09123456789' }]
    })
    expect(person).toMatchObject(viaJourney)
    // The heavy form's fields stay empty: no map, no birth date, no bank.
    expect(person).toMatchObject({ birthDate: '', location: null, address: '', accounts: [] })
  })

  it('keeps an owner card as a bank-less account like the journey', async () => {
    const person = await createQuickPerson('b1', { name: 'موسوی', card: '6104 3378 1234 5678' })

    expect(person).toMatchObject({
      firstName: '',
      lastName: 'موسوی',
      accounts: [{ bankName: '', accountNumber: '6104337812345678' }]
    })
  })

  it('refuses to save without a name', async () => {
    await expect(createQuickPerson('b1', { name: ' ' })).rejects.toThrow()
    expect(created).toHaveLength(0)
  })
})
