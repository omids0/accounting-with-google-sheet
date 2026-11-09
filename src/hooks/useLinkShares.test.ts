import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { useLinkShares, type LinkSharesState } from './useLinkShares'
import type { LinkTargetOption } from '../utils/linkTargetFit'

const option = (id: string, remaining: number): LinkTargetOption => ({
  id,
  title: `بدهی ${id}`,
  remaining,
  category: '',
  disabled: false,
  label: id
})

const options = [option('a', 1_200_000), option('b', 1_000_000), option('c', 2_500_000)]

type Props = { recordAmount: number; resetKey?: string | null }

let root: Root | null = null
let current: LinkSharesState

function Probe({ recordAmount, resetKey = 'dang' }: Props) {
  current = useLinkShares({ options, recordAmount, active: true, resetKey })

  return null
}

async function mount(props: Props) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  root = createRoot(document.createElement('div'))
  await act(async () => root!.render(createElement(Probe, props)))

  return async (next: Props) => act(async () => root!.render(createElement(Probe, next)))
}

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
})

describe('useLinkShares', () => {
  it('spreads untouched shares again, oldest first, when the amount changes', async () => {
    const rerender = await mount({ recordAmount: 3_000_000 })

    await act(async () => current.toggle('a'))
    await act(async () => current.toggle('b'))
    await act(async () => current.toggle('c'))
    expect(current.shares).toEqual({ a: 1_200_000, b: 1_000_000, c: 800_000 })
    await rerender({ recordAmount: 2_000_000 })
    expect(current.shares).toEqual({ a: 1_200_000, b: 800_000, c: 0 })
  })

  it('leaves a share the user wrote alone when the amount changes: the sum is checked, not rewritten', async () => {
    const rerender = await mount({ recordAmount: 3_000_000 })

    await act(async () => current.toggle('a'))
    await act(async () => current.toggle('c'))
    await act(async () => current.setShare('c', 1_000_000))
    await rerender({ recordAmount: 2_000_000 })
    expect(current.shares).toEqual({ a: 1_200_000, c: 1_000_000 })
    expect(current.problem).toEqual({ kind: 'sum', diff: -200_000 })
  })

  it('goes back to spreading once every item is unticked', async () => {
    const rerender = await mount({ recordAmount: 3_000_000 })

    await act(async () => current.toggle('a'))
    await act(async () => current.setShare('a', 500_000))
    await act(async () => current.toggle('a'))
    await act(async () => current.toggle('c'))
    await rerender({ recordAmount: 1_000_000 })
    expect(current.shares).toEqual({ c: 1_000_000 })
  })

  it('forgets everything when the category moves to another kind', async () => {
    const rerender = await mount({ recordAmount: 3_000_000 })

    await act(async () => current.toggle('a'))
    await rerender({ recordAmount: 3_000_000, resetKey: 'receivable' })
    expect(current.picks).toEqual([])
  })

  it('lists the picks in the order of the list, with their shares', async () => {
    await mount({ recordAmount: 3_000_000 })
    await act(async () => current.toggle('c'))
    await act(async () => current.toggle('a'))
    expect(current.picks.map(pick => [pick.id, pick.amount])).toEqual([
      ['a', 500_000],
      ['c', 2_500_000]
    ])
  })
})
