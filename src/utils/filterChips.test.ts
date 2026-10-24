import { describe, expect, it, vi } from 'vitest'

import { buildAmountRangeChip, buildWalletAccountChip } from './filterChips'

describe('records filter chips', () => {
  it('words an amount range with either end missing', () => {
    const remove = vi.fn()

    expect(buildAmountRangeChip(1000, 5000, remove).label).toBe('مبلغ از ۱٬۰۰۰ تا ۵٬۰۰۰')
    expect(buildAmountRangeChip(1000, '', remove).label).toBe('مبلغ از ۱٬۰۰۰')
    expect(buildAmountRangeChip('', 5000, remove).label).toBe('مبلغ تا ۵٬۰۰۰')
  })

  it('removes through onRemove and names the account', () => {
    const remove = vi.fn()
    const chip = buildWalletAccountChip('بانک ملی', remove)

    expect(chip.label).toBe('حساب: بانک ملی')
    chip.onRemove?.()
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
