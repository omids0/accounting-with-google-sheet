import { describe, expect, it } from 'vitest'

import { buildFieldColumnMap } from './sheetsHeaders'
import type { FieldConfig } from '../types'

const field = (id: string, label: string): FieldConfig => ({
  id,
  label,
  type: 'text',
  required: false
})

describe('buildFieldColumnMap', () => {
  it('maps by header label, and by position when the header is missing', () => {
    const map = buildFieldColumnMap(
      ['شناسه', 'زمان ثبت', 'عنوان', 'مبلغ'],
      [field('title', 'عنوان'), field('amount', 'مبلغ'), field('note', 'توضیحات')]
    )

    expect([...map]).toEqual([
      ['title', 2],
      ['amount', 3],
      ['note', 4]
    ])
  })

  it('never puts a header-less field on a column another field owns by label', () => {
    // «حساب» was appended to the form before its header reached this sheet,
    // and the user's own «پروژه» column sits where its position would land.
    const map = buildFieldColumnMap(
      ['شناسه', 'زمان ثبت', 'عنوان', 'پروژه'],
      [field('title', 'عنوان'), field('walletAccount', 'حساب'), field('project', 'پروژه')]
    )

    expect(map.get('project')).toBe(3)
    expect(map.get('walletAccount')).not.toBe(3)
    // Where migrateWalletAccountColumn appends the «حساب» header.
    expect(map.get('walletAccount')).toBe(4)
  })
})
