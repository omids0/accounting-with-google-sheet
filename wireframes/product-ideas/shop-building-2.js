// Cash count (idea ج): integer counts only, Persian digits, sheet follows the recount.
const $ = id => document.getElementById(id)
const fa = n => n.toLocaleString('fa-IR')
const APP = 6850000
const MAX = 9999
const inputs = [...document.querySelectorAll('[data-v]')]
const minus = n => `<bdi dir="ltr">−${fa(n)}</bdi>`
const plus = n => `<bdi dir="ltr">+${fa(n)}</bdi>`

// Keep digits only (Persian, Arabic or Latin), no sign, no decimal point, at most 9999 notes.
const clean = input => {
  const raw = window.enNum(input.value)
  const digits = raw.replace(/\D/g, '')
  let n = digits === '' ? null : parseInt(digits, 10)
  const bad = raw !== digits || (n !== null && n > MAX)

  if (n !== null && n > MAX) n = MAX
  input.value = n === null ? '' : window.faNum(n)
  return { n: n ?? 0, bad }
}

const calc = bad => {
  const counts = inputs.map(i => clean(i))
  const total = inputs.reduce((sum, input, k) => sum + counts[k].n * input.dataset.v, 0)
  const d = total - APP
  const zero = counts.every(c => c.n === 0)
  const sheet = $('sheet')

  $('err').hidden = !(bad || counts.some(c => c.bad))
  $('cnt').textContent = fa(total)
  $('diff').innerHTML = d ? (d < 0 ? `کسری ${fa(-d)}` : `اضافه ${fa(d)}`) : 'بدون اختلاف'
  $('diff').className = d < 0 ? 'neg' : d > 0 ? 'wn' : 'pos'
  $('dim').textContent = `شمارش ${fa(total)}، طبق اپ ${fa(APP)}`
  $('zero').hidden = !zero
  sheet.hidden = false
  $('sTitle').textContent =
    d < 0 ? `کسری ${fa(-d)} تومان` : d > 0 ? `اضافه ${fa(d)} تومان` : 'بدون اختلاف'
  $('sTitle').className = d < 0 ? 'neg' : d > 0 ? 'wn' : 'pos'
  $('sReason').textContent = d < 0 ? 'کسری شمارش شبانه' : d > 0 ? 'اضافهٔ شمارش شبانه' : '—'
  $('sAdj').innerHTML = d ? (d < 0 ? minus(-d) : plus(d)) : '۰'
  $('sAdj').className = d < 0 ? 'neg' : d > 0 ? 'wn' : ''
  $('sAfter').textContent = d
    ? `موجودی اپ می‌شود ${fa(total)} و با کشو یکی است.`
    : 'چیزی ثبت نمی‌شود.'
  $('save').disabled = !d || zero
}

inputs.forEach(i => i.addEventListener('input', () => calc(false)))
calc(false)

const btns = [...document.querySelectorAll('[data-ch]')]

btns.forEach(b =>
  b.addEventListener('click', () => {
    $('m-sms').hidden = b.dataset.ch !== 'sms'
    $('m-wa').hidden = b.dataset.ch !== 'wa'
    btns.forEach(x => x.classList.toggle('ghost', x !== b))
  })
)
