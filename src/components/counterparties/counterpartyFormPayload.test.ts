import { describe, expect, it } from 'vitest'

import { buildCounterpartyPayload } from './counterpartyFormPayload'
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
