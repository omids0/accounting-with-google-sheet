import { describe, expect, it } from 'vitest'

import {
  collectTemplateGroups,
  pickEntryTemplates,
  templateKey,
  templateWindowStart,
  type TemplateSourceRecord
} from './entryTemplates'

const TODAY = '2026-10-12'

function record(
  category: string,
  date: string,
  extra: Partial<Record<'subCategory' | 'walletAccount' | 'title' | 'amount', string>> = {},
  createdAt = ''
): TemplateSourceRecord {
  return {
    createdAt,
    values: { category, date, amount: '100', title: category, ...extra }
  }
}

function times(count: number, make: (index: number) => TemplateSourceRecord) {
  return Array.from({ length: count }, (_, index) => make(index))
}

describe('collectTemplateGroups', () => {
  it('keeps groups with at least three records, most used first', () => {
    const records = [
      ...times(3, i => record('خوراک', `2026-10-0${i + 1}`)),
      ...times(5, i => record('بنزین', `2026-09-0${i + 1}`)),
      ...times(2, i => record('رستوران', `2026-10-0${i + 1}`))
    ]

    expect(collectTemplateGroups(records, TODAY).map(group => group.category)).toEqual([
      'بنزین',
      'خوراک'
    ])
  })

  it('groups by category, subcategory and wallet account', () => {
    const records = [
      ...times(3, () => record('قبوض', '2026-10-01', { subCategory: 'برق', walletAccount: 'a' })),
      ...times(2, () => record('قبوض', '2026-10-01', { subCategory: 'آب', walletAccount: 'a' })),
      record('قبوض', '2026-10-01', { subCategory: 'برق', walletAccount: 'b' })
    ]
    const groups = collectTemplateGroups(records, TODAY)

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      key: templateKey('قبوض', 'برق', 'a'),
      subCategory: 'برق',
      accountId: 'a',
      count: 3
    })
  })

  it('takes the title and amount of the newest record', () => {
    const records = [
      record('خوراک', '2026-10-05', { title: 'نان', amount: '50000' }),
      record('خوراک', '2026-10-09', { title: 'میوه', amount: '250000' }, '۱۴۰۵/۷/۱۷, ۱۰:۰۰:۰۰'),
      record('خوراک', '2026-10-09', { title: 'شیر', amount: '90000' }, '۱۴۰۵/۷/۱۷, ۰۹:۰۰:۰۰'),
      record('خوراک', '2026-09-01', { title: 'برنج', amount: '900000' })
    ]

    expect(collectTemplateGroups(records, TODAY)[0]).toMatchObject({
      title: 'میوه',
      amount: 250_000,
      count: 4
    })
  })

  it('counts only the last six months', () => {
    expect(templateWindowStart(TODAY)).toBe('2026-04-09')

    const records = [
      ...times(2, () => record('اجاره', '2026-05-01')),
      record('اجاره', '2026-04-01'),
      record('اجاره', '2026-10-20')
    ]

    expect(collectTemplateGroups(records, TODAY)).toEqual([])
    expect(collectTemplateGroups([...records, record('اجاره', TODAY)], TODAY)).toHaveLength(1)
  })

  it('skips records without a category', () => {
    expect(
      collectTemplateGroups(
        times(4, () => record('', '2026-10-01')),
        TODAY
      )
    ).toEqual([])
  })
})

describe('pickEntryTemplates', () => {
  const groups = collectTemplateGroups(
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].flatMap((category, index) =>
      times(10 - index, () => record(category, '2026-10-01'))
    ),
    TODAY
  )
  const key = (category: string) => templateKey(category, '', '')

  it('shows at most six chips in count order', () => {
    expect(
      pickEntryTemplates(groups, { pinned: [], hidden: [] }).map(group => group.category)
    ).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('puts pinned chips first and drops hidden ones', () => {
    const picked = pickEntryTemplates(groups, {
      pinned: [key('h'), key('g')],
      hidden: [key('a'), key('g')]
    })

    expect(picked.map(group => group.category)).toEqual(['h', 'b', 'c', 'd', 'e', 'f'])
    expect(picked[0].pinned).toBe(true)
    expect(picked[1].pinned).toBe(false)
  })

  it('ignores a pin whose group no longer qualifies', () => {
    expect(pickEntryTemplates(groups, { pinned: [key('zzz')], hidden: [] })[0].category).toBe('a')
  })
})
