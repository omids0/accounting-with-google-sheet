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

  const show = id => {
    tabs.forEach(tab => tab.classList.toggle('on', tab.dataset.idea === id))
    ideas.forEach(idea => idea.classList.toggle('on', idea.id === id))
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
})()
