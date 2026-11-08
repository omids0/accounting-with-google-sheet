import { describe, expect, it } from 'vitest'

import { detectInvoiceUnit, parseInvoiceText } from './parseInvoiceText'

const RIAL_INVOICE = [
  'فروشگاه نمونه',
  'تاریخ: ۱۴۰۵/۰۸/۱۷',
  'شرح کالا   تعداد   فی   مبلغ (ریال)',
  'شیر پرچرب  ۲  ۴۵۰٬۰۰۰  ۹۰۰٬۰۰۰',
  'نان سنگک  ۱۲۰٬۰۰۰',
  'تخفیف  ۵۰٬۰۰۰',
  'مالیات بر ارزش افزوده  ۶۰٬۰۰۰',
  'جمع کل  ۱٬۰۲۰٬۰۰۰'
]

describe('parseInvoiceText', () => {
  it('reads items, total and date, converting rial to the app toman', () => {
    const parsed = parseInvoiceText(RIAL_INVOICE, 'toman')

    expect(parsed.unit).toBe('rial')
    expect(parsed.date).toBe('2026-11-08')
    expect(parsed.total).toBe(102_000)
    expect(parsed.items).toEqual([
      { name: 'شیر پرچرب', amount: 90_000, unitPrice: 45_000, quantity: 2, note: '2' },
      { name: 'نان سنگک', amount: 12_000 }
    ])
  })

  it('keeps rial when the app runs in rial', () => {
    const parsed = parseInvoiceText(RIAL_INVOICE, 'rial')

    expect(parsed.total).toBe(1_020_000)
    expect(parsed.items[1].amount).toBe(120_000)
  })

  it('leaves amounts as printed when the invoice names no unit', () => {
    const parsed = parseInvoiceText(['ماست  ۶۵٬۰۰۰', 'جمع کل ۶۵٬۰۰۰'], 'toman')

    expect(parsed.unit).toBeNull()
    expect(parsed.items).toEqual([{ name: 'ماست', amount: 65_000 }])
    expect(parsed.total).toBe(65_000)
  })

  it('skips phone, card and reference rows and date text', () => {
    const parsed = parseInvoiceText(
      ['تلفن ۰۲۱۸۸۸۸۸۸۸۸', 'شماره کارت ۶۱۰۴۳۳۷۸۱۲۳۴۵۶۷۸', 'کد پیگیری ۱۲۳۴۵۶', 'تاریخ ۱۴۰۵/۰۸/۱۷'],
      'toman'
    )

    expect(parsed.items).toEqual([])
  })

  it('ignores number-only rows and rows with a single letter', () => {
    const parsed = parseInvoiceText(['۱۲۳٬۰۰۰', 'ب ۵٬۰۰۰'], 'toman')

    expect(parsed.items).toEqual([])
  })

  it('marks a row whose numbers do not multiply out as uncertain', () => {
    const parsed = parseInvoiceText(['پودر لباسشویی ۳ ۱۷۳٬۰۰۰', 'ماست ۴ × ۷۹٬۰۰۰ ۳۱۹٬۰۰۰'], 'toman')

    expect(parsed.items.map(item => item.uncertain)).toEqual([true, true])
  })

  it('infers the quantity when the amount is a whole multiple of the unit price', () => {
    const parsed = parseInvoiceText(['سیب زمینی ۲۸٬۵۰۰ ۱۴۲٬۵۰۰'], 'toman')

    expect(parsed.items).toEqual([
      { name: 'سیب زمینی', amount: 142_500, unitPrice: 28_500, quantity: 5, note: '5' }
    ])
  })

  it('keeps two large numbers that are no multiple of each other uncertain', () => {
    const parsed = parseInvoiceText(['شکر ۱۲۱٬۰۰۰ ۳۸۰٬۰۰۰'], 'toman')

    expect(parsed.items[0].uncertain).toBe(true)
  })

  it('drops a row whose only number is a single misread digit', () => {
    expect(parseInvoiceText(['اری ۱'], 'toman').items).toEqual([])
  })

  it('removes stray glyphs around a name', () => {
    const parsed = parseInvoiceText(['lc پودر لباسشویی ۲۵۰٬۰۰۰', 'سیب زمینی ه ۱۴۲٬۵۰۰'], 'toman')

    expect(parsed.items.map(item => item.name)).toEqual(['پودر لباسشویی', 'سیب زمینی'])
  })

  it('returns an empty proposal for empty input', () => {
    expect(parseInvoiceText([], 'toman')).toEqual({
      items: [],
      total: null,
      date: null,
      unit: null
    })
  })
})

describe('detectInvoiceUnit', () => {
  it('prefers the unit named more often and gives null on a tie', () => {
    expect(detectInvoiceUnit(['مبلغ ریال', 'جمع ریال', 'تومان'])).toBe('rial')
    expect(detectInvoiceUnit(['مبلغ ریال', 'تومان'])).toBeNull()
    expect(detectInvoiceUnit(['فقط متن'])).toBeNull()
  })
})

/** What the Arabic recognizer really returned for a printed table invoice (digits dropped, «پ» as «ب»). */
const REAL_TABLE_LINES = [
  'ميوه و تره بار گلشن',
  'شماره فاكتور ٩ ٩١ اري',
  'رديف نام كالا تعداد فى مبلغ',
  'پودر لباسشويى ٣ ١٧٣،٠٠٠ ١٩٠٠٠',
  ' كابل شارژ موبايل ٢ ١٥٢،٠٠٠ ٣٠٤',
  '٣ شكر سفيد ٤ ١٢١،٠٠٠ ٢٨٣٠٠٠',
  '٤ سيیب زمينى ه ٢٨٥٠٠ ١٣٢٥٠٠',
  'ه سبزى خوردن ٤ ٧٩،٠٠٠ ٣١٩٠٠٠',
  ' رب گوجه فرنگى ه ٨٢،٠٠٠ ٣١٠،٠٠',
  'جمع كل ،٥٠٠ ٢،١',
  'ماليات بر ارزش افزوده ١٩٩،٠٠٠',
  'مبلغ قابل برداخت ٢،٣٧١،٥٠٠'
]

describe('parseInvoiceText on real recognizer output', () => {
  const parsed = parseInvoiceText(REAL_TABLE_LINES, 'toman')

  it('takes the payable total over a garbled «جمع کل»', () => {
    expect(parsed.total).toBe(2_371_500)
  })

  it('restores digits the recognizer dropped from the amount (quantity × unit price)', () => {
    expect(parsed.items.find(item => item.name === 'پودر لباسشویی')).toMatchObject({
      amount: 519_000,
      unitPrice: 173_000,
      quantity: 3,
      uncertain: true
    })
    expect(parsed.items.find(item => item.name === 'کابل شارژ موبایل')).toMatchObject({
      amount: 304_000,
      quantity: 2
    })
  })

  it('does not read a row number as a quantity', () => {
    const sugar = parsed.items.find(item => item.name.includes('شکر'))

    expect(sugar).not.toHaveProperty('unitPrice')
    expect(sugar?.uncertain).toBe(true)
  })

  it('keeps the header, the shop name and the tax row out of the items', () => {
    expect(parsed.items.map(item => item.name).join(' ')).not.toMatch(/ردیف|گلشن|مالیات/)
  })
})

describe('parseInvoiceText on a thermal receipt', () => {
  it('pairs a name line with the numbers line under it', () => {
    const parsed = parseInvoiceText(
      [
        'ميوه و تره بار كلشن',
        'شماره فاكتور',
        'مرغ تازه',
        '2 94,000 188,000',
        'كره حيوانى',
        '5 × 82,000 410,000',
        'جمع كل 598,000'
      ],
      'toman'
    )

    expect(parsed.items).toEqual([
      { name: 'مرغ تازه', amount: 188_000, unitPrice: 94_000, quantity: 2, note: '2' },
      { name: 'کره حیوانی', amount: 410_000, unitPrice: 82_000, quantity: 5, note: '5' }
    ])
    expect(parsed.total).toBe(598_000)
  })

  it('guesses the total from the biggest number when no total row survived', () => {
    const parsed = parseInvoiceText(['مرغ تازه', '188,000', 'کره', '410,000', '598,000'], 'toman')

    expect(parsed.total).toBe(598_000)
  })
})
