import { describe, expect, it, vi } from 'vitest'

import { cn } from './cn'
import type * as CnModule from './cn'

const joined = vi.hoisted(() => [] as string[])

vi.mock('./cn', async importOriginal => {
  const actual = await importOriginal<typeof CnModule>()

  return {
    ...actual,
    cx: (...classes: Parameters<typeof actual.cx>) => {
      const value = actual.cx(...classes)

      joined.push(value)

      return value
    }
  }
})

describe('cn', () => {
  it('lets a later class win a Tailwind conflict', () => {
    expect(cn('px-4 py-2', 'px-2')).toBe('py-2 px-2')
    expect(cn('p-card', 'p-2')).toBe('p-2')
  })
})

describe('cx style constants', () => {
  it('never needs conflict resolution: every module-level cx() equals its cn()', async () => {
    const modules = import.meta.glob([
      '../components/**/*Styles.ts',
      '../components/chartsPage/ChartsPeriodBar.tsx',
      '../components/counterparties/PhoneNumberLinks.tsx'
    ])

    await Promise.all(Object.values(modules).map(load => load()))

    expect(joined.length).toBeGreaterThan(250)
    expect(joined.filter(value => cn(value) !== value)).toEqual([])
  })
})
