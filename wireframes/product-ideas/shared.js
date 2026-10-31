// Custom share (idea ب): the slider is mother's share of the 800,000 tuition paid by Bazari.
const sl = document.getElementById('sl')
const fa = n => n.toLocaleString('fa-IR')
const set = (id, text) => (document.getElementById(id).textContent = text)
const TOTAL = 800000
const OTHERS = 287500 // 225,000 + 60,000 + 2,500 owed back to mother

const upd = () => {
  const p = +sl.value
  const mine = (TOTAL * p) / 100
  const net = mine - OTHERS

  set('who', `سهم مادر ${fa(p)}٪ و بازاری ${fa(100 - p)}٪`)
  set('m', fa(mine))
  set('b', fa(TOTAL - mine))
  set(
    'eff',
    `مانده کل بعد از این خرج: ${
      net >= 0 ? 'شما به بازاری بدهکارید' : 'بازاری به شما بدهکار است'
    } ${fa(Math.abs(net))} تومان`
  )
  const warn = document.getElementById('warn')

  warn.hidden = p > 0 && p < 100
  warn.textContent =
    p === 0
      ? 'سهم مادر صفر است؛ بازاری همهٔ ۸۰۰٬۰۰۰ را خودش می‌دهد و بدهی‌ای ثبت نمی‌شود.'
      : 'سهم بازاری صفر است؛ مادر همهٔ ۸۰۰٬۰۰۰ را به او بدهکار می‌شود.'
}

sl.addEventListener('input', upd)
document.querySelectorAll('[data-p]').forEach(b =>
  b.addEventListener('click', () => {
    sl.value = b.dataset.p
    upd()
  })
)
upd()
