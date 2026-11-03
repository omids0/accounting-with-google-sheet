const fs = [...document.querySelectorAll('[data-f]')]
const rows = [...document.querySelectorAll('[data-by]')]
fs.forEach(b =>
  b.addEventListener('click', () => {
    fs.forEach(x => x.classList.toggle('on', x === b))
    rows.forEach(r => {
      r.hidden = b.dataset.f !== 'all' && !r.dataset.by.split(' ').includes(b.dataset.f)
    })
  })
)
