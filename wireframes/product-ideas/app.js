// Shared behaviour for the product-ideas prototype: idea tabs, dark mode, highlight toggle.
;(() => {
  const root = document.documentElement

  try {
    const saved = localStorage.getItem('ideas-theme')

    if (saved) root.dataset.theme = saved
  } catch {
    /* storage may be blocked: the toggle still works for this page */
  }

  document.querySelector('[data-toggle=theme]')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'

    root.dataset.theme = next
    try {
      localStorage.setItem('ideas-theme', next)
    } catch {
      /* ignore */
    }
  })

  document.querySelector('[data-toggle=new]')?.addEventListener('click', () => {
    document.body.classList.toggle('hide-new')
  })

  const tabs = [...document.querySelectorAll('.tabs button')]
  const ideas = [...document.querySelectorAll('.idea')]

  document.querySelector('.tabs')?.setAttribute('role', 'tablist')
  tabs.forEach(tab => tab.setAttribute('role', 'tab'))

  const show = id => {
    tabs.forEach(tab => {
      const on = tab.dataset.idea === id

      tab.classList.toggle('on', on)
      tab.setAttribute('aria-selected', String(on))
      tab.tabIndex = on ? 0 : -1
    })
    ideas.forEach(idea => {
      idea.classList.toggle('on', idea.id === id)
      idea.setAttribute('role', 'tabpanel')
    })
    history.replaceState(null, '', `#${id}`)
  }

  tabs.forEach(tab => tab.addEventListener('click', () => show(tab.dataset.idea)))
  if (tabs.length) show(location.hash.slice(1) || tabs[0].dataset.idea)

  // Tiny helper for demos: [data-demo=toggle] flips the next [data-demo-target] block.
  document.querySelectorAll('[data-demo=toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.target)

      if (target) target.hidden = !target.hidden
    })
  })

  // Demo buttons: [data-demo-msg="what the app records, as a full clause"] shows a toast and a done mark.
  const toast = document.createElement('div')
  let timer

  toast.className = 'toast'
  toast.hidden = true
  toast.setAttribute('role', 'status')
  document.body.append(toast)

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-demo-msg]')

    if (!button || button.disabled) return
    if (button.tagName === 'A') event.preventDefault()
    button.classList.add('done')
    toast.textContent = `نمونه: در اپ اینجا ${button.dataset.demoMsg}.`
    toast.hidden = false
    clearTimeout(timer)
    timer = setTimeout(() => (toast.hidden = true), 3200)
  })

  // Digit helpers for pages: faNum(12) gives ۱۲, enNum("۱۲") gives "12" (count inputs show Persian digits).
  const faDigits = '۰۱۲۳۴۵۶۷۸۹'
  const toEn = v =>
    v
      .replace(/[۰-۹]/g, d => String(faDigits.indexOf(d)))
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))

  window.faNum = n => String(n).replace(/d/g, d => faDigits[d])
  window.enNum = toEn
})()
