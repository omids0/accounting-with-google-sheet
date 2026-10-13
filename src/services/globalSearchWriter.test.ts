import { describe, expect, it } from 'vitest'

import type { SearchEntry } from './globalSearch'
import { withWriterNames } from './globalSearchWriter'

const entry = (writer?: string): SearchEntry => ({
  group: 'records',
  id: 'r1',
  title: 'تعمیر یخچال',
  subtitle: 'هزینه',
  amount: -1,
  date: '',
  text: 'تعمیر یخچال',
  amounts: [1],
  writer
})

describe('withWriterNames', () => {
  it('leaves a private spreadsheet alone', () => {
    const entries = [entry('sara@example.com')]

    expect(withWriterNames(entries)).toBe(entries)
  })

  it('makes the writer name searchable without touching the subtitle', () => {
    const [named, old] = withWriterNames([entry('sara@example.com'), entry()], () => 'سارا')

    expect(named.text).toContain('سارا')
    expect(named.subtitle).toBe('هزینه')
    expect(old.text).toBe('تعمیر یخچال')
  })
})
