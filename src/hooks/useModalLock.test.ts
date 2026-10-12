import { act, createElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import FormModal from '../components/FormModal'

type FormModalProps = ComponentProps<typeof FormModal>

const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')

describe('modal Escape and focus', () => {
  let container: HTMLDivElement

  let root: Root

  const closeOuter = vi.fn()

  const closeInner = vi.fn()

  const pressEscape = () =>
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    })

  const modal = (props: Omit<FormModalProps, 'children'>, ...children: ReactNode[]) =>
    createElement(FormModal, props as FormModalProps, ...children)

  const render = (innerOpen: boolean, innerSaving: boolean, outerVariant?: 'panel') =>
    act(() =>
      root.render(
        modal(
          {
            open: true,
            title: 'بیرونی',
            onClose: closeOuter,
            onSubmit: vi.fn(),
            saveLabel: 'ثبت',
            variant: outerVariant
          },
          createElement('input', { 'aria-label': 'مبلغ' }),
          modal(
            {
              open: innerOpen,
              title: 'درونی',
              onClose: closeInner,
              onSubmit: vi.fn(),
              saveLabel: 'ثبت',
              saving: innerSaving
            },
            createElement('input', { 'aria-label': 'نام' })
          )
        )
      )
    )

  // The inner modal opens from inside the outer one, as in the app.
  const renderNested = (innerSaving = false, outerVariant?: 'panel') => {
    render(false, false, outerVariant)
    render(true, innerSaving, outerVariant)
  }

  beforeAll(() => {
    // jsdom has no layout, so every element would look hidden to the focus filter.
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return this.parentNode
      }
    })
  })

  afterAll(() => {
    if (offsetParent) Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent)
  })

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    closeOuter.mockReset()
    closeInner.mockReset()
  })

  it('closes only the top modal on one Escape', () => {
    renderNested()
    pressEscape()

    expect(closeInner).toHaveBeenCalledOnce()
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('keeps a saving modal open and leaves the one below alone', () => {
    renderNested(true)
    pressEscape()

    expect(closeInner).not.toHaveBeenCalled()
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('closes only the top modal over the desktop side panel', () => {
    renderNested(false, 'panel')
    pressEscape()

    expect(closeInner).toHaveBeenCalledOnce()
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('keeps Shift+Tab inside the top modal', () => {
    renderNested()

    const panels = document.body.querySelectorAll('[role="dialog"]')
    const inner = panels[panels.length - 1]

    // From the inner modal's first control (✕), Shift+Tab wraps to its last one.
    act(() => inner.querySelector<HTMLElement>('[data-modal-close]')?.focus())
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
      )
    })

    expect(inner.contains(document.activeElement)).toBe(true)
    expect(document.activeElement?.textContent).toBe('انصراف')
  })

  it('focuses the first field instead of the close button', () => {
    renderNested()

    expect(document.activeElement?.getAttribute('aria-label')).toBe('نام')
  })

  it('gives each modal its own title id', () => {
    renderNested()

    const dialogs = document.body.querySelectorAll('[role="dialog"]')
    const ids = Array.from(dialogs, dialog => dialog.getAttribute('aria-labelledby'))

    expect(new Set(ids).size).toBe(2)
    ids.forEach(id => expect(document.getElementById(id ?? '')).not.toBeNull())
  })
})
