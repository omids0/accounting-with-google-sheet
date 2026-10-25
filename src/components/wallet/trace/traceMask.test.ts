import { describe, expect, it } from 'vitest'

import { maskAmountsInText } from './traceMask'

describe('maskAmountsInText', () => {
  it('leaves the text alone when amounts are shown', () => {
    expect(maskAmountsInText('۳٬۰۰۰٬۰۰۰ تومان', false)).toBe('۳٬۰۰۰٬۰۰۰ تومان')
  })

  it('hides amounts written in words, as an activity line says them', () => {
    expect(maskAmountsInText('۵ میلیون به هدف «سفر» واریز کرد', true)).toBe(
      '••• به هدف «سفر» واریز کرد'
    )
    expect(maskAmountsInText('۲ میلیون و ۲۰۰ هزار تومان', true)).toBe('••• تومان')
    expect(maskAmountsInText('۳۰۰ هزار', true)).toBe('•••')
  })

  it('hides grouped and long numbers but not dates or small counts', () => {
    expect(maskAmountsInText('مبلغ ۱٬۵۰۰٬۰۰۰ تومان در ۱۴۰۵/۰۸/۰۳ و ۳ رکورد', true)).toBe(
      'مبلغ ••• تومان در ۱۴۰۵/۰۸/۰۳ و ۳ رکورد'
    )
    expect(maskAmountsInText('500000 و 1,200', true)).toBe('••• و •••')
  })
})
