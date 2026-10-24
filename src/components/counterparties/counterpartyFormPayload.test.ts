import { describe, expect, it } from 'vitest'

import {
  buildCounterpartyPayload,
  PHONE_ERROR,
  phoneError,
  validateCounterpartyForm
} from './counterpartyFormPayload'
import type { CounterpartyFormState } from './types'

const form: CounterpartyFormState = {
  firstName: ' امید ',
  lastName: 'سهیل‌نیا',
  birthDate: '',
  address: '',
  location: null,
  phones: [{ number: ' 0912 ' }, { number: '' }],
  accounts: [{ bankName: '', accountNumber: '' }],
  note: ''
}

describe('buildCounterpartyPayload', () => {
  it('leaves the «من» flag out of a personal counterparty', () => {
    const payload = buildCounterpartyPayload(form)

    expect(payload).not.toHaveProperty('me')
    expect(payload.phones).toEqual([{ number: '0912' }])
  })

  it('carries the «من» flag a building form sets, on or off', () => {
    expect(buildCounterpartyPayload({ ...form, me: true })).toMatchObject({ me: true })
    expect(buildCounterpartyPayload({ ...form, me: false })).toMatchObject({ me: false })
  })
})

describe('phoneError', () => {
  it('accepts an empty phone, a mobile and a landline', () => {
    expect(phoneError('')).toBe(true)
    expect(phoneError('09121234567')).toBe(true)
    expect(phoneError('+98 912 123 4567')).toBe(true)
    expect(phoneError('02112345678')).toBe(true)
  })

  it('rejects letters and wrong lengths', () => {
    expect(phoneError('123abc')).toBe(PHONE_ERROR)
    expect(phoneError('0912')).toBe(PHONE_ERROR)
  })

  it('keeps a number already saved on the counterparty', () => {
    expect(phoneError('0912', ['0912'])).toBe(true)
    expect(phoneError('0913', ['0912'])).toBe(PHONE_ERROR)
  })
})

describe('validateCounterpartyForm', () => {
  it('names the missing field first, then a bad phone', () => {
    expect(validateCounterpartyForm({ ...form, firstName: ' ' })).toBe('نام الزامی است')
    expect(validateCounterpartyForm({ ...form, lastName: '' })).toBe('نام خانوادگی الزامی است')
    expect(validateCounterpartyForm(form)).toBe(PHONE_ERROR)
    expect(validateCounterpartyForm(form, ['0912'])).toBeNull()
  })
})

describe('buildCounterpartyPayload phones', () => {
  it('saves a valid number in its plain 0-prefixed form', () => {
    const payload = buildCounterpartyPayload({
      ...form,
      phones: [{ number: '+98 912 123 4567' }, { number: '۰۲۱-۱۲۳۴۵۶۷۸' }]
    })

    expect(payload.phones).toEqual([{ number: '09121234567' }, { number: '02112345678' }])
  })
})
