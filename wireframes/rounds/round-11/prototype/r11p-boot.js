/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — boot: side panel (routes), query-driven sheets, start */
'use strict'
function openFromQuery() {
  const s = curR && curR.q.get('s')
  if (!s) return
  if (s === 'pay') return ACT.payopen({ u: curR.q.get('u') })
  if (SHEETS[s]) ACT.sheet({ n: s, m: curR.q.get('m') || '', u: curR.q.get('u') || '' })
}
function sideHTML() {
  const b = S.buildings.find(x => x.id === 'b1')
  const id = b ? b.id : 'b1'
  const u3 = b ? unitByNo(b, 3) : null
  const u5 = b ? unitByNo(b, 5) : null
  const U = u3 ? u3.id : ''
  const L = (n, to, t) => `<a href="${to}" data-n="${n}">${fa(n)} · ${t}</a>`
  const B = pg => `#/b/${id}/${pg}`
  return `<h3>مدیر ساختمان — پروتوتایپ زنده</h3>
  <div class="tools"><button data-t="theme">${
    S.theme === 'dark' ? '☀ روشن' : '☾ تیره'
  }</button><button data-t="reset">بازنشانی داده‌ها</button><button data-t="empty">حالت بار اول (خالی)</button><button data-t="nextmonth">⏭ ماه بعد (امروز: ${dateFa(
    TODAY
  )})</button></div>
  <h4>من کدام عضو هستم؟ (شبیه‌سازی)</h4><div class="tools">${(
    (curB() || S.buildings[0] || { members: [] }).members || []
  )
    .map(
      (m, i) =>
        `<button data-t="me:${i}" class="${
          ((curB() || S.buildings[0] || {}).meIndex || 0) === i ? 'on' : ''
        }">${esc(m.name)} · ${memberRole(m)}</button>`
    )
    .join('')}</div>
  <p class="note">همه‌چیز زنده است: صدور شارژ، پرداخت، رسید، تقسیم هزینه، پیامک، پل‌ها. داده‌ها در مرورگر ذخیره می‌شود.</p>
  <h4>حساب شخصی</h4>
  ${L(1, '#/p/dashboard', 'داشبورد + منوی شخصی')}${L(
    2,
    '#/p/buildings',
    'مدیر ساختمان (فهرست یا خالی)'
  )}${L(3, '#/p/new/1', 'تعریف ساختمان · قدم ۱')}${L(4, '#/p/new/2', 'تعریف ساختمان · قدم ۲')}
  <h4>داخل ساختمان نرگس</h4>
  ${L(5, B('units') + '?s=quick', 'ساخت سریع واحدها')}${L(7, B('dashboard'), 'داشبورد خلوت')}${L(
    9,
    B('units'),
    'واحدها'
  )}${L(10, B('residents'), 'ساکنان')}${L(11, B('charges'), 'شارژ (ماه‌ها)')}${L(
    12,
    B('expenses'),
    'هزینه‌ها'
  )}${L(13, B('fund'), 'صندوق')}${L(14, B('dang'), 'بدهی به مدیر')}${L(
    15,
    B('checks'),
    'چک‌ها'
  )}${L(16, B('counterparties'), 'طرف حساب‌ها')}
  ${L(17, `#/b/${id}/unit/${U}`, 'صفحهٔ واحد ۳ (بدهکار)')}${L(
    18,
    B('units') + '?s=unitForm',
    'فرم واحد'
  )}${L(19, B('charges') + '?s=issue', 'صدور شارژ (پیش‌نمایش)')}${L(
    20,
    `#/b/${id}/unit/${U}?s=pay&u=${U}`,
    'پرداخت و رسید'
  )}${L(21, B('expenses') + '?s=expenseForm', 'فرم کامل هزینه')}${L(
    22,
    B('sms'),
    'پیامک بانکی و مسیریابی'
  )}${L(23, B('reports'), 'گزارش‌ها و مجمع')}${L(24, B('settings'), 'تنظیمات و فهرست‌ها')}${L(
    25,
    B('continuity'),
    'پشتیبان و تحویل مدیریت'
  )}
  <h4>سناریوها</h4>
  <a href="${B('units')}?f=debt">فقط بدهکارها</a><a href="${B(
    'settings'
  )}?s=lists">فهرست‌های مدیریت‌پذیر (نوع هزینه)</a>`
}
function refreshSide() {
  const el = document.getElementById('side')
  el.innerHTML = sideHTML()
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-t]')
  if (!t) return
  if (t.dataset.t === 'theme') ACT.theme()
  if (t.dataset.t === 'reset') {
    resetAll()
    location.hash = '#/p/dashboard'
  }
  if (t.dataset.t === 'nextmonth') ACT.nextmonth()
  if (t.dataset.t.startsWith('me:')) {
    const rb = curB() || S.buildings[0]
    if (rb) rb.meIndex = Number(t.dataset.t.slice(3))
    UI.sheet = null
  }
  if (t.dataset.t === 'empty') {
    S.buildings = []
    location.hash = '#/p/buildings'
  }
  refreshSide()
  render()
})
window.addEventListener('hashchange', () => setTimeout(openFromQuery, 0))
load()
if (!location.hash) location.hash = '#/p/dashboard'
refreshSide()
render()
openFromQuery()
