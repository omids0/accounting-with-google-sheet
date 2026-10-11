import { describe, expect, it } from 'vitest'

import { isFieldHidden } from './fieldUtils'

const field = (id: string) => ({ id, label: id, type: 'select' as const, required: false })

describe('isFieldHidden', () => {
  it('hides the balance switch until an account is chosen', () => {
    expect(isFieldHidden(field('walletApply'), { walletAccount: '' })).toBe(true)
    expect(isFieldHidden(field('walletApply'), {})).toBe(true)
    expect(isFieldHidden(field('walletApply'), { walletAccount: 'acc' })).toBe(false)
  })

  it('never hides other fields', () => {
    expect(isFieldHidden(field('walletAccount'), { walletAccount: '' })).toBe(false)
  })
})
