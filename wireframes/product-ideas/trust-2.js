document.querySelectorAll('.seg .acts').forEach(group => {
  group.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return
    group.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target))
  })
})
