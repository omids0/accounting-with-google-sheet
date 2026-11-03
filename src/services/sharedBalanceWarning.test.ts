import { describe, expect, it } from 'vitest'

import { sharedBalanceWarning } from '../components/shared/sharedViewModel'

describe('sharedBalanceWarning', () => {
  const names = { 'mina@x.com': 'مینا' }

  it('says who owes whom and how much while the balance is open', () => {
    const net = { 'me@x.com': 3_140_000, 'mina@x.com': -3_140_000 }

    expect(sharedBalanceWarning(net, 'me@x.com', names)).toBe(
      'مینا ۳٬۱۴۰٬۰۰۰ تومان به شما بدهکار است.'
    )
    expect(sharedBalanceWarning(net, 'mina@x.com', {})).toBe(
      'شما ۳٬۱۴۰٬۰۰۰ تومان به شریک بدهکارید.'
    )
  })

  it('is null when the account is settled', () => {
    expect(sharedBalanceWarning({ 'me@x.com': 0, 'mina@x.com': 0 }, 'me@x.com', names)).toBeNull()
  })
})
