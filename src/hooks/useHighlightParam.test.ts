import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useHighlightParam } from './useHighlightParam'
import IncrementalCardList from '../components/IncrementalCardList'

type Row = { id: string }

const rows = (count: number): Row[] => Array.from({ length: count }, (_, i) => ({ id: `r${i}` }))

/** A page like the module pages: reads `?highlight=` and renders a windowed list of cards. */
function Page({ items }: { items: Row[] }) {
  const highlightId = useHighlightParam()

  return createElement(IncrementalCardList<Row>, {
    items,
    getId: row => row.id,
    resetKey: '',
    mustInclude: [highlightId],
    renderItem: row => createElement('div', { key: row.id, 'data-highlight-id': row.id }, row.id)
  })
}

describe('useHighlightParam with a windowed list', () => {
  const scrollIntoView = vi.fn()
  let host: HTMLDivElement

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    scrollIntoView.mockReset()
    Element.prototype.scrollIntoView = scrollIntoView
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)

      return 0
    })
    host = document.createElement('div')
    document.body.append(host)
  })

  afterEach(() => {
    host.remove()
    vi.unstubAllGlobals()
  })

  const mount = (url: string, items: Row[]) => {
    const root = createRoot(host)
    const render = (next: Row[]) =>
      act(() =>
        root.render(
          createElement(
            MemoryRouter,
            { initialEntries: [url] },
            createElement(Page, { items: next })
          )
        )
      )

    render(items)

    return { render }
  }

  it('renders and scrolls to a target far beyond the first 50 cards', () => {
    mount('/checks?highlight=r249', rows(300))

    const target = host.querySelector('[data-highlight-id="r249"]')

    expect(target).not.toBeNull()
    expect(host.querySelectorAll('[data-highlight-id]')).toHaveLength(250)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(target)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })

  it('scrolls once the rows arrive after the page mounted (mirror still loading)', async () => {
    const view = mount('/checks?highlight=r120', [])

    expect(scrollIntoView).not.toHaveBeenCalled()
    view.render(rows(300))
    await act(async () => {
      await Promise.resolve()
    })

    expect(host.querySelector('[data-highlight-id="r120"]')).not.toBeNull()
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('shows only the first 50 cards without a deep link', () => {
    mount('/checks', rows(300))

    expect(host.querySelectorAll('[data-highlight-id]')).toHaveLength(50)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
