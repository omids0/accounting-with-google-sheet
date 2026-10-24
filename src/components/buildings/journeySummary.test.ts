import { describe, expect, it } from 'vitest'

import { buildJourneySummary, issuedMonths, monthTitle } from './journeySummary'
import { newUnit } from '../../services/buildingUnits'

const profile = {
  name: 'نرگس',
  address: 'ولنجک',
  floors: 5,
  defaultCharge: 1_200_000,
  chargeMethod: 'fixed' as const,
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'half' as const
}

const receivable = (reference: string, amount: number) => ({ reference, amount } as never)

describe('issuedMonths', () => {
  it('lists the charge months once, oldest first', () => {
    expect(
      issuedMonths([
        { reference: 'charge:u1:1405-07' },
        { reference: 'charge:u2:1405-07' },
        { reference: 'charge:u1:1405-06' },
        { reference: 'opening:u1' },
        {}
      ])
    ).toEqual(['1405-06', '1405-07'])
  })

  it('names a month', () => {
    expect(monthTitle('1405-07')).toBe('مهر ۱۴۰۵')
  })
})

describe('buildJourneySummary', () => {
  const build = (receivables: never[] = []) =>
    buildJourneySummary({
      profile,
      units: [
        newUnit({ number: '1' }),
        { ...newUnit({ number: '2' }), occupancy: 'tenant' as const }
      ].map((unit, index) => ({ ...unit, rowNumber: index + 2 })),
      accounts: [
        { title: 'ملت', balance: 17_200_000 },
        { title: 'نقدی', balance: 1_200_000 }
      ],
      receivables,
      members: [{ email: 'a@x.com', role: 'manager' }]
    })

  const row = (summary: ReturnType<typeof build>, label: string) =>
    summary.sections.flatMap(section => section.rows).find(item => item.label === label)

  it('lists the building, units and occupancy, accounts with their total, and the members', () => {
    const summary = build()

    expect(row(summary, 'واحدها')?.value).toBe('۲ واحد · ۱ مالک ساکن · ۱ مستأجر · ۰ خالی')
    expect(row(summary, 'جمع')?.value).toContain('۱۸٬۴۰۰٬۰۰۰')
    expect(row(summary, 'a@x.com')?.value).toBe('مدیر')
    expect(summary.text).toContain('خلاصهٔ راه‌اندازی نرگس')
  })

  it('says the first charge is not issued yet, and has no previous debts', () => {
    const summary = build()

    expect(row(summary, 'شارژ اول')?.value).toBe('صادر نشده')
    expect(row(summary, 'بدهی‌های قبلی')?.value).toBe('—')
  })

  it('reports the first issued month and the previous debts', () => {
    const summary = build([
      receivable('charge:u1:1405-07', 1_200_000),
      receivable('charge:u2:1405-07', 600_000),
      receivable('opening:u2', 800_000)
    ])

    expect(row(summary, 'شارژ مهر ۱۴۰۵')?.value).toContain('۲ واحد')
    expect(row(summary, 'بدهی‌های قبلی')?.value).toContain('۱ واحد')
  })
})
