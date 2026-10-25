import { describe, expect, it } from 'vitest'

import { maskAmountsInText } from './traceMask'

describe('maskAmountsInText', () => {
  it('leaves the text alone when amounts are shown', () => {
    expect(maskAmountsInText('۳٬۰۰۰٬۰۰۰ تومان', false)).toBe('۳٬۰۰۰٬۰۰۰ تومان')
  })

  it('hides grouped and long numbers but not dates or small counts', () => {
    expect(maskAmountsInText('مبلغ ۱٬۵۰۰٬۰۰۰ تومان در ۱۴۰۵/۰۸/۰۳ و ۳ رکورد', true)).toBe(
      'مبلغ ••• تومان در ۱۴۰۵/۰۸/۰۳ و ۳ رکورد'
    )
    expect(maskAmountsInText('500000 و 1,200', true)).toBe('••• و •••')
  })
})
