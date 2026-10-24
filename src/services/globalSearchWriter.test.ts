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

  it('looks a writer up once however many rows they wrote, and skips empty names', () => {
    const asked: string[] = []
    const entries = [
      entry('sara@example.com'),
      entry('sara@example.com'),
      entry('nameless@example.com'),
      entry('sara@example.com')
    ]
    const result = withWriterNames(entries, email => {
      asked.push(email)

      return email.startsWith('sara') ? 'سارا ي' : ''
    })

    expect(asked).toEqual(['sara@example.com', 'nameless@example.com'])
    expect(result.map(item => item.text)).toEqual([
      'تعمیر یخچال سارا ی',
      'تعمیر یخچال سارا ی',
      'تعمیر یخچال',
      'تعمیر یخچال سارا ی'
    ])
    expect(result[2]).toBe(entries[2])
  })
})
