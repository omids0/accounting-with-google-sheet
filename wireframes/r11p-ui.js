/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — UI shell: router, render loop, form controls, sheets, drawer */
'use strict'
const UI = {
  anim: {},
  drawer: false,
  sheet: null,
  toast: null,
  openSel: null,
  f: {},
  w: {},
  fab: false,
  page: { d: {} },
  lastKey: ''
}
const esc = s =>
  String(s ?? '').replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  )
const en = s =>
  String(s ?? '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[,٬\s]/g, '')
const num = s => Number(en(s)) || 0
const P = d => `<path d="${d}"/>`
const ICONS = {
  menu: P('M3 12h18M3 6h18M3 18h18'),
  search: '<circle cx="11" cy="11" r="8"/>' + P('m21 21-4.3-4.3'),
  plus: P('M12 5v14M5 12h14'),
  home: P('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10'),
  building: P('M3 21h18M5 21V3h14v18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2'),
  users:
    '<circle cx="9" cy="7" r="4"/>' +
    P(
      'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
    ),
  user: '<circle cx="12" cy="7" r="4"/>' + P('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'),
  clip:
    P('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2') +
    '<rect x="8" y="2" width="8" height="4" rx="1"/>',
  card: '<rect x="1" y="4" width="22" height="16" rx="2"/>' + P('M1 10h22'),
  chart: P('M18 20V10M12 20V4M6 20v-6'),
  sliders: P('M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'),
  info: '<circle cx="12" cy="12" r="10"/>' + P('M12 16v-4M12 8h.01'),
  back: P('M5 12h14M12 5l7 7-7 7'),
  down: P('M6 9l6 6 6-6'),
  left: P('M15 18l-6-6 6-6'),
  more: P('M12 12h.01M12 5h.01M12 19h.01'),
  phone: P(
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'
  ),
  share: P('M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13'),
  trash: P(
    'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'
  ),
  edit: P('M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z'),
  close: P('M18 6L6 18M6 6l12 12'),
  check: P('M20 6L9 17l-5-5'),
  sun:
    '<circle cx="12" cy="12" r="5"/>' +
    P(
      'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'
    ),
  moon: P('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'),
  msg: P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
  exit: P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
  clipb: P(
    'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'
  ),
  down2: P('M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6'),
  bank: P('M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3'),
  file: P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6'),
  list: P('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  dl: P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3')
}
const ico = (n, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`

/* ---------- bindings ---------- */
function rootOf(name) {
  return name === 'd'
    ? UI.sheet
      ? UI.sheet.d
      : UI.page.d
    : name === 'f'
    ? UI.f
    : name === 'b'
    ? curB()
    : UI.w
}
function getB(path) {
  const [r, ...ks] = path.split('.')
  let o = rootOf(r)
  for (const k of ks) {
    if (o == null) return undefined
    o = o[k]
  }
  return o
}
function setB(path, v) {
  const [r, ...ks] = path.split('.')
  let o = rootOf(r)
  ks.slice(0, -1).forEach(k => {
    o[k] ??= {}
    o = o[k]
  })
  o[ks[ks.length - 1]] = v
}

/* ---------- form controls (same shapes as FormField / Select / ToggleSwitch) ---------- */
function field(label, inner, hint) {
  return `<div class="field">${label ? `<label>${label}</label>` : ''}${inner}${
    hint ? `<span class="hint">${hint}</span>` : ''
  }</div>`
}
function txt(label, bind, o = {}) {
  if (o.amount) return amt(label, bind, o)
  const v = getB(bind)
  return field(
    label,
    `<input class="input" ${o.num || o.tel ? 'inputmode="numeric"' : ''} ${
      o.type ? `type="${o.type}"` : ''
    } data-bind="${bind}" ${o.num ? 'data-num="1"' : ''} value="${esc(
      o.num && typeof v === 'number' ? (v ? fa(v) : '') : v ?? ''
    )}" placeholder="${esc(o.ph || '')}" autocomplete="off" />`,
    o.hint
  )
}
function sel(label, bind, options, o = {}) {
  const v = getB(bind)
  const id = o.id || bind
  const cur = options.find(x => String(x.value) === String(v))
  const open = UI.openSel === id
  const menu = open
    ? `<div class="menu" role="listbox">${options
        .map(x =>
          x.manage
            ? `<button class="opt manage" data-a="go" data-to="${x.manage}">${esc(
                x.label
              )}</button>`
            : `<button class="opt ${
                String(x.value) === String(v) ? 'on' : ''
              }" role="option" data-a="selpick" data-bind="${bind}" data-v="${esc(x.value)}" ${
                o.after ? `data-after="${o.after}"` : ''
              }>${esc(x.label)}${x.hint ? `<small>${esc(x.hint)}</small>` : ''}</button>`
        )
        .join('')}</div>`
    : ''
  return field(
    label,
    `<div class="sel ${open ? 'open' : ''} ${
      o.up ? 'up' : ''
    }"><button type="button" class="selbtn" aria-haspopup="listbox" aria-expanded="${open}" data-a="seltoggle" data-id="${esc(
      id
    )}"><span class="${cur ? '' : 'ph'}">${esc(
      cur ? cur.label : o.ph || 'انتخاب کنید'
    )}</span>${ico('down')}</button>${menu}</div>`,
    o.hint
  )
}
function tog(label, bind, hint) {
  const on = !!getB(bind)
  return `<div class="toggle"><span class="tx">${label}${
    hint ? `<small class="sub">${hint}</small>` : ''
  }</span><button type="button" class="sw ${
    on ? 'on' : ''
  }" role="switch" aria-checked="${on}" data-a="tog" data-bind="${bind}"></button></div>`
}
function chk(label, bind) {
  return `<label class="check"><input type="checkbox" data-bind="${bind}" data-chk="1" ${
    getB(bind) ? 'checked' : ''
  }/> ${label}</label>`
}
const optsFrom = list =>
  list.filter(x => !x.hidden).map(x => ({ value: x.value, label: x.label, hint: x.hint }))

/* ---------- sheets, toasts ---------- */
function openSheet(name, d = {}, p = {}) {
  UI.anim.sheet = true
  UI.sheet = { name, d, p }
  UI.openSel = null
  render()
}
function closeSheet() {
  UI.sheet = null
  UI.openSel = null
  render()
}
let toastTimer
function toast(msg) {
  UI.toast = msg
  UI.anim.toast = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    UI.toast = null
    render()
  }, 2600)
  render()
}
function go(to) {
  if (location.hash === to) render()
  else location.hash = to
}

/* ---------- router ---------- */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '')
  const [path, q] = h.split('?')
  const parts = path.split('/').filter(Boolean)
  const R = { raw: h, zone: parts[0] || 'p', parts, q: new URLSearchParams(q || '') }
  if (R.zone === 'b') {
    R.bid = parts[1]
    R.page = parts[2] || 'dashboard'
    R.arg = parts[3]
  } else {
    R.zone = 'p'
    R.page = parts[1] || 'dashboard'
    R.arg = parts[2]
  }
  return R
}
let curR = null
const curB = () => (curR && curR.zone === 'b' ? S.buildings.find(x => x.id === curR.bid) : null)

/* ---------- drawer ---------- */
function dlink(to, icon, label, on, extra = '') {
  return `<button class="dl ${on ? 'on' : ''}" data-a="go" data-to="${to}">${ico(
    icon
  )}<span style="flex:1">${label}</span>${extra}</button>`
}
