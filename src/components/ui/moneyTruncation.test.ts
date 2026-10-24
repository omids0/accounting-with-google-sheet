import { describe, expect, it } from 'vitest'

import { moneyDisplayClass } from './displayStyles'
import type { MoneyDisplaySize, MoneyDisplayTone } from '../MoneyDisplay'

const TRUNCATING = /(^|\s)(truncate|text-ellipsis|line-clamp-\d+)(\s|$)/
const MONEY_NAME = /money|amount|balance|total|stat(?!us)|hero|yearCardCell/i

const styleModules = import.meta.glob<Record<string, unknown>>('./*Styles.ts', { eager: true })

describe('money is never ellipsized', () => {
  const entries = Object.entries(styleModules).flatMap(([file, mod]) =>
    Object.entries(mod)
      .filter(([name, value]) => typeof value === 'string' && MONEY_NAME.test(name))
      .map(([name, value]) => ({ name: `${file}:${name}`, value: value as string }))
  )

  it('finds the money style constants', () => {
    expect(entries.length).toBeGreaterThan(10)
  })

  it.each(entries)('$name has no truncating class', ({ value }) => {
    expect(value).not.toMatch(TRUNCATING)
  })

  it('has none on any MoneyDisplay size and tone', () => {
    const sizes: MoneyDisplaySize[] = ['hero', 'stat', 'stat-wide', 'record']
    const tones: MoneyDisplayTone[] = ['default', 'hero', 'income', 'expense', 'primary']

    for (const size of sizes) {
      for (const tone of tones) {
        expect(moneyDisplayClass({ size, tone })).not.toMatch(TRUNCATING)
      }
    }
  })

  it('lets the hero strip and year-review values wrap', async () => {
    const { dashboardHeroStripValueClass } = await import('./dashboardCalmStyles')
    const { yearCardCellValueClass } = await import('./periodReportStyles')

    expect(dashboardHeroStripValueClass).toContain('overflow-wrap:anywhere')
    expect(yearCardCellValueClass).toContain('overflow-wrap:anywhere')
  })
})
