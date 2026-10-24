import { act, createElement, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import FormModal from './FormModal'

describe('FormModal submit lock', () => {
  it('runs onSubmit once for three submits in the same tick', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    let finish: () => void = () => undefined
    const onSubmit = vi.fn((event: Event) => {
      event.preventDefault()

      return new Promise<void>(resolve => (finish = resolve))
    })
    const root = createRoot(document.createElement('div'))

    act(() =>
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(
            FormModal,
            {
              open: true,
              title: 'x',
              onClose: vi.fn(),
              onSubmit,
              saveLabel: 'ذخیره'
            } as unknown as ComponentProps<typeof FormModal>,
            createElement('input')
          )
        )
      )
    )

    const form = document.body.querySelector('form') as HTMLFormElement

    act(() => {
      for (let i = 0; i < 3; i += 1) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      }
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await act(async () => finish())
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(onSubmit).toHaveBeenCalledTimes(2)
    act(() => root.unmount())
  })
})
