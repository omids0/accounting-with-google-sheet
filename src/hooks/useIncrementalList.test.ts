import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import { LIST_PAGE_SIZE, useIncrementalList, windowSizeFor } from './useIncrementalList'

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

type Row = { id: string }
type Props = { items: Row[]; resetKey?: string; mustInclude?: (string | null)[] }

function mountRows(initial: Props) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const holder: { list?: ReturnType<typeof useIncrementalList<Row>> } = {}
  const root = createRoot(document.createElement('div'))
  const Probe = ({ items, resetKey, mustInclude }: Props) => {
    holder.list = useIncrementalList(items, { resetKey, mustInclude })

    return null
  }
  const render = (props: Props) => act(() => root.render(createElement(Probe, props)))

  render(initial)

  return { render, list: () => holder.list! }
}

const rows = (count: number): Row[] => Array.from({ length: count }, (_, i) => ({ id: `r${i}` }))

describe('windowSizeFor', () => {
  const data = rows(300)
  const idOf = (row: Row) => row.id

  it('is the position of the furthest wanted row, plus one', () => {
    expect(windowSizeFor(data, ['r249'], idOf)).toBe(250)
    expect(windowSizeFor(data, ['r3', 'r120'], idOf)).toBe(121)
  })

  it('is 0 for no ids or ids that are not in the list', () => {
    expect(windowSizeFor(data, [], idOf)).toBe(0)
    expect(windowSizeFor(data, ['gone'], idOf)).toBe(0)
  })
})

describe('useIncrementalList mustInclude', () => {
  it('grows the window to the next step that holds a deep-link target', () => {
    const view = mountRows({ items: rows(300), mustInclude: ['r120'] })

    expect(view.list().visible).toHaveLength(150)
    expect(view.list().visible.some(row => row.id === 'r120')).toBe(true)
    expect(view.list().remaining).toBe(150)
  })

  it('leaves a target inside the first step alone', () => {
    expect(mountRows({ items: rows(300), mustInclude: ['r10'] }).list().visible).toHaveLength(50)
  })

  it('ignores empty ids', () => {
    expect(mountRows({ items: rows(300), mustInclude: [null] }).list().visible).toHaveLength(50)
  })

  it('waits for the data: the window grows when the row arrives', () => {
    const view = mountRows({ items: [], mustInclude: ['r200'] })

    expect(view.list().visible).toHaveLength(0)
    view.render({ items: rows(300), mustInclude: ['r200'] })
    expect(view.list().visible).toHaveLength(250)
  })

  it('keeps the window when the same target is passed again and when data reloads', () => {
    const view = mountRows({ items: rows(300), mustInclude: ['r120'] })

    view.render({ items: rows(300), mustInclude: ['r120'] })
    expect(view.list().visible).toHaveLength(150)
  })

  it('grows again for a new target, never shrinks while the target stays', () => {
    const view = mountRows({ items: rows(300), mustInclude: ['r120'] })

    view.render({ items: rows(300), mustInclude: ['r120', 'r270'] })
    expect(view.list().visible).toHaveLength(300)
    view.render({ items: rows(300), mustInclude: ['r120'] })
    expect(view.list().visible).toHaveLength(300)
  })

  it('starts over at the first step when the reset key changes, without re-revealing', () => {
    const view = mountRows({ items: rows(300), resetKey: 'a', mustInclude: ['r120'] })

    expect(view.list().visible).toHaveLength(150)
    view.render({ items: rows(300), resetKey: 'b', mustInclude: ['r120'] })
    expect(view.list().visible).toHaveLength(50)
    view.render({ items: rows(300), resetKey: 'b', mustInclude: ['r120'] })
    expect(view.list().visible).toHaveLength(50)
  })

  it('still adds a step per tap after a reveal', () => {
    const view = mountRows({ items: rows(300), mustInclude: ['r120'] })

    act(() => view.list().showMore())
    expect(view.list().visible).toHaveLength(200)
  })
})
