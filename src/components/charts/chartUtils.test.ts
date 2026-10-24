import { describe, expect, it } from 'vitest'

import { buildDonutSlices, DONUT_OTHERS_LABEL } from './chartUtils'

const category = (name: string, total: number) => ({ name, total })

describe('buildDonutSlices', () => {
  it('keeps every category when they fit', () => {
    const data = [category('خوراک', 5), category('سایر', 2)]

    expect(buildDonutSlices(data, 6)).toBe(data)
  })

  it('sums the smallest categories into one «سایر دسته‌ها» slice', () => {
    const data = [
      category('الف', 50),
      category('ب', 40),
      category('ج', 30),
      category('د', 20),
      category('ه', 10),
      category('و', 5),
      category('ز', 1)
    ]

    expect(buildDonutSlices(data, 4)).toEqual([
      category('الف', 50),
      category('ب', 40),
      category('ج', 30),
      category(DONUT_OTHERS_LABEL, 36)
    ])
  })

  it('never shows two slices with the same name when a real «سایر» category exists', () => {
    const data = [
      category('خوراک', 90),
      category('سایر', 30),
      category('حمل و نقل', 20),
      category('قبض', 10),
      category('تفریح', 5),
      category('سلامت', 3),
      category('آموزش', 1)
    ]
    const names = buildDonutSlices(data, 6).map(slice => slice.name)

    expect(names).toContain('سایر')
    expect(names).toContain(DONUT_OTHERS_LABEL)
    expect(new Set(names).size).toBe(names.length)
    expect(DONUT_OTHERS_LABEL).not.toBe('سایر')
  })

  it('drops an empty rest instead of adding a zero slice', () => {
    const data = [category('الف', 5), category('ب', 4), category('ج', 0), category('د', 0)]

    expect(buildDonutSlices(data, 3)).toEqual([category('الف', 5), category('ب', 4)])
  })
})
