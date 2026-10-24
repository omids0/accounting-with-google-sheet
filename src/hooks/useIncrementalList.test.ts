import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import { LIST_PAGE_SIZE, useIncrementalList } from './useIncrementalList'

function mount(items: number[]) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const holder: { list?: ReturnType<typeof useIncrementalList<number>> } = {}
  const Probe = () => {
    holder.list = useIncrementalList(items)

    return null
  }

  act(() => createRoot(document.createElement('div')).render(createElement(Probe)))

  return holder as { list: ReturnType<typeof useIncrementalList<number>> }
}

describe('useIncrementalList', () => {
  const items = Array.from({ length: 103 }, (_, index) => index)

  it('shows the first 50 and says how many the next tap adds', () => {
    const { list } = mount(items)

    expect(LIST_PAGE_SIZE).toBe(50)
    expect(list.visible).toHaveLength(50)
    expect(list.remaining).toBe(53)
    expect(list.nextStep).toBe(50)
  })

  it('adds a step per tap and shortens the last one', () => {
    const holder = mount(items)

    act(() => holder.list.showMore())
    expect(holder.list.visible).toHaveLength(100)
    expect(holder.list.remaining).toBe(3)
    expect(holder.list.nextStep).toBe(3)

    act(() => holder.list.showMore())
    expect(holder.list.visible).toHaveLength(103)
    expect(holder.list.remaining).toBe(0)
    expect(holder.list.nextStep).toBe(0)
  })

  it('shows a short list whole', () => {
    expect(mount([1, 2, 3]).list.remaining).toBe(0)
  })
})
