import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteHost from './ConfirmDeleteHost'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { confirmDelete, type ConfirmDeleteResult } from '../utils/confirmDelete'

const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')

const buttons = () => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button'))
const button = (text: string) => buttons().find(item => item.textContent === text)!
const click = (element: Element) =>
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
const settle = () => act(async () => undefined)

describe('the shared delete confirmation', () => {
  let container: HTMLDivElement
  let root: Root

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
  })

  const ask = (checkbox?: { label: string; defaultChecked?: boolean }) => {
    const answer: { value?: ConfirmDeleteResult | null } = {}

    act(() => root.render(createElement(ConfirmDeleteHost)))
    act(() => {
      void confirmDelete({ label: 'چک ۱۲۳', message: 'چک ۱۲۳ پاک می‌شود.', checkbox }).then(
        value => {
          answer.value = value
        }
      )
    })

    return answer
  }

  it('shows «X حذف شود؟» with a bright «انصراف» that has the first focus', () => {
    ask()

    expect(document.body.querySelector('h2')?.textContent).toBe('چک ۱۲۳ حذف شود؟')
    expect(document.activeElement).toBe(button('انصراف'))
    // Cancel is the filled danger button; delete is the quiet secondary one.
    expect(button('انصراف').className).toContain('bg-danger')
    expect(button('حذف').className).not.toContain('bg-danger')
    expect(button('حذف').className).toContain('border-border')
  })

  it('does nothing on «انصراف», ✕ or the backdrop', async () => {
    const closers = [
      () => button('انصراف'),
      () => document.body.querySelector('[data-modal-close]')!,
      () => document.body.querySelector('button[aria-label="بستن"]:not([data-modal-close])')!
    ]

    for (const closer of closers) {
      const answer = ask()

      click(closer())
      await settle()

      expect(answer.value).toBeNull()
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    }
  })

  it('confirms only with the quiet «حذف»', async () => {
    const answer = ask()

    click(button('حذف'))
    await settle()

    expect(answer.value).toEqual({ checked: false })
  })

  it('offers an unchecked box that is passed back when ticked', async () => {
    const answer = ask({ label: 'رکوردهای مالی مرتبط (۲ مورد) هم حذف شوند' })
    const box = document.body.querySelector<HTMLInputElement>('input[type="checkbox"]')!

    expect(box.checked).toBe(false)
    expect(document.body.textContent).toContain('رکوردهای مالی مرتبط (۲ مورد) هم حذف شوند')
    click(box)
    click(button('حذف'))
    await settle()

    expect(answer.value).toEqual({ checked: true })
  })

  it('starts a checkbox that is on by default as checked', () => {
    ask({ label: 'هزینهٔ مرتبط هم حذف شود', defaultChecked: true })

    expect(document.body.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(
      true
    )
  })

  it('has no checkbox when the question has none', () => {
    ask()

    expect(document.body.querySelector('input[type="checkbox"]')).toBeNull()
  })
})

describe('ConfirmActionModal tones', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('keeps the primary look of the default tone', () => {
    act(() =>
      root.render(
        createElement(ConfirmActionModal, {
          open: true,
          title: 'خروج',
          message: 'خارج می‌شوی؟',
          onClose: vi.fn(),
          onConfirm: vi.fn()
        })
      )
    )

    expect(button('بله').className).not.toContain('border-border')
    expect(button('خیر').className).toContain('border-border')
    expect(document.body.querySelector('[data-modal-initial-focus]')).toBeNull()
  })

  it('ConfirmDeleteModal is the danger tone: busy locks both answers', () => {
    act(() =>
      root.render(
        createElement(ConfirmDeleteModal, {
          open: true,
          message: 'پاک شود؟',
          deleting: true,
          onClose: vi.fn(),
          onConfirm: vi.fn()
        })
      )
    )

    expect(button('انصراف').className).toContain('bg-danger')
    expect(button('انصراف').disabled).toBe(true)
    expect(document.body.querySelector<HTMLButtonElement>('[data-modal-close]')?.disabled).toBe(
      true
    )
    expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
