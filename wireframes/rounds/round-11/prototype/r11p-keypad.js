/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — dial pad for every money field */
'use strict'
const KP_MAX = 12
function amt(label, bind, o = {}) {
  const v = Number(getB(bind)) || 0
  const plain = String(label || '').replace(/<[^>]*>/g, '')
  return field(
    label,
    `<button type="button" class="input amtbtn" data-a="kpopen" data-bind="${bind}" data-label="${esc(
      plain
    )}" aria-label="${esc(plain)}">${
      v
        ? `<b class="amtv">${fa(v)}</b><span class="amtu">تومان</span>`
        : `<span class="ph">${esc(o.ph || 'مبلغ را وارد کنید')}</span>`
    }</button>`,
    o.hint
  )
}
ACT.kpopen = d => {
  const v = Number(getB(d.bind)) || 0
  UI.keypad = { bind: d.bind, label: d.label, val: v ? String(v) : '' }
  UI.openSel = null
  UI.anim.kp = true
}
ACT.kp = d => {
  const k = UI.keypad
  if (!k) return false
  let v = k.val
  if (d.k === 'back') v = v.slice(0, -1)
  else if (d.k === 'clear') v = ''
  else if (d.k === '000') v = v ? v + '000' : ''
  else v = (v === '0' ? '' : v) + d.k
  if (v.length > KP_MAX) return false
  k.val = v
}
ACT.kpadd = d => {
  const k = UI.keypad
  const n = (Number(k.val) || 0) + Number(d.v)
  if (String(n).length > KP_MAX) return false
  k.val = String(n)
}
ACT.kpdone = () => {
  const k = UI.keypad
  setB(k.bind, Number(k.val || 0))
  UI.keypad = null
}
ACT.kpclose = () => {
  UI.keypad = null
}
function keypadHTML() {
  const k = UI.keypad
  if (!k) return ''
  const n = Number(k.val) || 0
  const key = (lab, kk, cls = '') =>
    `<button type="button" class="kpk ${cls}" data-a="kp" data-k="${kk}">${lab}</button>`
  const an = UI.anim.kp ? ' anim' : ''
  return `<div class="scrim kps${an}" data-a="kpclose" style="z-index:70"></div><div class="kp${an}" role="dialog" aria-label="${esc(
    k.label
  )}">
  <div class="kph"><span>${esc(
    k.label
  )}</span><button class="ibtn flat" data-a="kpclose" aria-label="بستن">${ico(
    'close'
  )}</button></div>
  <div class="kpd">${n ? fa(n) : '۰'}<small>تومان</small></div>
  <div class="kpq">${[100000, 1000000, 10000000]
    .map(v => `<button type="button" class="chip" data-a="kpadd" data-v="${v}">+${fa(v)}</button>`)
    .join('')}</div>
  <div class="kpg">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => key(fa(i), i)).join('')}${key(
    '۰۰۰',
    '000',
    'alt'
  )}${key('۰', '0')}${key(ico('back'), 'back', 'alt')}</div>
  <div class="btns" style="padding:8px 12px 12px"><button class="btn" data-a="kp" data-k="clear">پاک کردن</button><button class="btn primary" data-a="kpdone">تأیید</button></div></div>`
}
/* desktop keyboard works too */
document.addEventListener(
  'keydown',
  e => {
    if (!UI.keypad) return
    if (/^[0-9]$/.test(e.key)) ACT.kp({ k: e.key })
    else if (e.key === 'Backspace') ACT.kp({ k: 'back' })
    else if (e.key === 'Enter') ACT.kpdone()
    else if (e.key === 'Escape') ACT.kpclose()
    else return
    e.preventDefault()
    e.stopImmediatePropagation()
    render()
  },
  true
)
