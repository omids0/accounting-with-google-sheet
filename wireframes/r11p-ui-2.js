/* eslint-disable -- prototype scripts share globals, not part of the app source */
function drawerHTML(R, b) {
  if (!UI.drawer) return ''
  let body
  if (b) {
    const id = b.id
    const L = (pg, icon, label, alts = []) =>
      dlink(`#/b/${id}/${pg}`, icon, label, R.page === pg || alts.includes(R.page))
    const debtors = b.units.filter(u => unitBalance(b, u.id).open > 0).length
    body = `<div class="prof"><span class="av">${esc(
      b.name.replace('ساختمان ', '')[0]
    )}</span><div><b>${esc(b.name)}</b><small>نقش شما: ${esc(roleName(b))} · شیت: حسابداری · ${esc(
      b.name
    )}</small></div></div>
    <div class="dg"><h5>ساختمان</h5>
      ${L('dashboard', 'home', 'داشبورد ساختمان')}${L('units', 'building', 'واحدها', ['unit'])}${L(
      'residents',
      'users',
      'ساکنان'
    )}${L('charges', 'clip', 'شارژ')}${L('expenses', 'down2', 'هزینه‌ها')}${L(
      'fund',
      'card',
      'صندوق'
    )}
      <h5>تعهدات ساختمان</h5>
      ${L('dang', 'list', 'بدهی به مدیر / پیمانکار')}${L('checks', 'file', 'چک‌های ساختمان')}
      <h5>بیشتر</h5>
      ${L('counterparties', 'user', 'طرف حساب‌های ساختمان')}${
      can('record') ? L('sms', 'msg', 'پیامک بانکی') : ''
    }${L('reports', 'chart', 'گزارش‌ها و مجمع')}${
      can('settings') ? L('settings', 'sliders', 'تنظیمات ساختمان') : ''
    }
      <h5>اپ</h5>
      <button class="dl" data-a="about">${ico(
        'info'
      )}<span style="flex:1">درباره و راهنما</span></button>
    </div>
    <button class="dl back" data-a="go" data-to="#/p/dashboard">${ico(
      'exit'
    )}<span>↩ برگشت به حساب شخصی</span></button>`
  } else {
    const L = (pg, icon, label) =>
      dlink(
        `#/p/${pg}`,
        icon,
        label,
        R.page === pg || (pg === 'buildings' && ['new', 'connect'].includes(R.page))
      )
    const stub = (icon, label) =>
      `<button class="dl" data-a="stub">${ico(icon)}<span style="flex:1">${label}</span></button>`
    body = `<div class="prof"><span class="av">ا</span><div><b>امید سهیل‌نیا</b><small>شیت: حسابداری اصلی</small></div></div>
    <div class="dg"><h5>پول</h5>${L('dashboard', 'home', 'داشبورد')}${stub(
      'card',
      'کیف پول'
    )}${stub('list', 'رکوردها')}
    <h5>تعهدات</h5>${stub('file', 'اقساط · چک‌ها · بدهی · طلب‌ها')}
    <h5>بیشتر</h5>${stub('msg', 'یادآوری')}${L('buildings', 'building', 'مدیر ساختمان')}${stub(
      'user',
      'طرف حساب‌ها'
    )}
    <h5>اپ</h5>${stub('sliders', 'تنظیمات')}<button class="dl" data-a="about">${ico(
      'info'
    )}<span style="flex:1">درباره و راهنما</span></button></div>`
  }
  const an = UI.anim.drawer ? ' anim' : ''
  return `<div class="scrim${an}" data-a="drawer"></div><aside class="drawer${an}" aria-label="منو">${body}</aside>`
}

/* ---------- sheet frame ---------- */
function sheetHTML() {
  if (!UI.sheet) return ''
  const def = SHEETS[UI.sheet.name]
  if (!def) return ''
  const s = def(UI.sheet, curB())
  journeyWrap(s, UI.sheet.name, curB())
  const an = UI.anim.sheet ? ' anim' : ''
  return `<div class="sheetwrap"><div class="scrim${an}" data-a="sheetclose"></div><div class="sheet${an} ${
    s.full ? 'full' : ''
  }" role="dialog" aria-label="${esc(s.title)}"><div class="sh"><h2>${
    s.title
  }</h2><button class="ibtn flat" data-a="sheetclose" aria-label="بستن">${ico(
    'close'
  )}</button></div><div class="sb">${s.body}</div>${
    s.foot ? `<div class="sf">${s.foot}</div>` : ''
  }</div></div>`
}

/* ---------- render ---------- */
function render() {
  const app = document.getElementById('phone')
  if (!app) return
  const R = (curR = parseRoute())
  let b = null
  if (R.zone === 'b') {
    b = S.buildings.find(x => x.id === R.bid)
    if (!b) return void (location.hash = '#/p/buildings')
    S.in = b.id
    autoIssue(b)
    S.lastBuilding = b.id
  } else S.in = null
  document.documentElement.dataset.theme = S.theme
  const key = R.raw.split('?')[0]
  const changed = UI.lastKey !== key
  if (changed) {
    UI.lastKey = key
    UI.f = {}
    UI.fab = false
    UI.page = { d: {} }
  }
  const pageDef = (R.zone === 'b' ? BPAGES : PPAGES)[R.page]
  let pg = pageDef
    ? pageDef(R, b)
    : { title: 'یافت نشد', html: '<div class="empty">این صفحه وجود ندارد</div>' }
  if (b && PAGE_PERMS[R.page] && !can(PAGE_PERMS[R.page]))
    pg = {
      title: pg.title,
      html:
        '<div class="empty"><b>دسترسی ندارید</b>این بخش با نقش «' +
        roleName(b) +
        '» در دسترس نیست.</div>'
    }
  if (pg.fab) pg.fab = pg.fab.filter(allowedFab)
  if (pg.fab && !pg.fab.length) pg.fab = null
  const prevC = app.querySelector('.content')?.scrollTop || 0
  const prevS = app.querySelector('.sb')?.scrollTop || 0
  const left = pg.back
    ? `<button class="ibtn" data-a="go" data-to="${pg.back}" aria-label="برگشت">${ico(
        'back'
      )}</button>`
    : `<button class="ibtn" data-a="drawer" aria-label="منو">${ico('menu')}</button>`
  const fab = pg.fab
    ? `${
        UI.fab && pg.fab.length > 1
          ? `<div class="fabmenu">${pg.fab
              .map(f => `<button class="btn" data-a="${f.a}" ${f.data || ''}>${f.label}</button>`)
              .join('')}</div>`
          : ''
      }<button class="fab" aria-label="افزودن" data-a="${
        pg.fab.length === 1 ? pg.fab[0].a : 'fab'
      }" ${pg.fab.length === 1 ? pg.fab[0].data || '' : ''}>${ico(
        UI.fab && pg.fab.length > 1 ? 'close' : 'plus'
      )}</button>`
    : ''
  app.innerHTML = `<header class="hdr">${left}<h1>${esc(pg.title)}${
    pg.sub || b ? `<small>${esc(pg.sub || (b ? b.name : ''))}</small>` : ''
  }</h1>${pg.actions || ''}<button class="ibtn" data-a="theme" aria-label="تم">${ico(
    S.theme === 'dark' ? 'sun' : 'moon'
  )}</button></header><main class="content" id="content">${pg.html}</main>${fab}${drawerHTML(
    R,
    b
  )}${sheetHTML()}${keypadHTML()}${
    UI.toast
      ? `<div class="toast${UI.anim.toast ? ' anim' : ''}" role="status">${UI.toast}</div>`
      : ''
  }`
  UI.anim = {}
  applyRoleGates(app)
  const c = app.querySelector('.content')
  const sb = app.querySelector('.sb')
  if (!changed && c) c.scrollTop = prevC
  if (sb) sb.scrollTop = prevS
  if (typeof refreshSide === 'function') refreshSide()
  document
    .querySelectorAll('.side a')
    .forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#/' + key))
  save()
}

/* ---------- events ---------- */
const ACT = {}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]')
  const inSel = e.target.closest('.sel')
  let redraw = false
  if (UI.openSel && !inSel) {
    UI.openSel = null
    redraw = true
  }
  if (!el) {
    if (redraw) render()
    return
  }
  const fn = ACT[el.dataset.a]
  if (!fn) return
  const r = fn(el.dataset, el)
  if (r !== false) render()
})
document.addEventListener('input', e => {
  const t = e.target
  if (!t.dataset || !t.dataset.bind) return
  if (t.dataset.chk) setB(t.dataset.bind, t.checked)
  else setB(t.dataset.bind, t.dataset.num ? num(t.value) : t.value)
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (UI.openSel) UI.openSel = null
    else if (UI.sheet) UI.sheet = null
    else if (UI.drawer) UI.drawer = false
    render()
  }
})

Object.assign(ACT, {
  go: d => {
    UI.drawer = false
    UI.sheet = null
    UI.fab = false
    go(d.to)
    return false
  },
  drawer: () => {
    UI.drawer = !UI.drawer
    if (UI.drawer) UI.anim.drawer = true
  },
  fab: () => {
    UI.fab = !UI.fab
  },
  theme: () => {
    S.theme = S.theme === 'dark' ? 'light' : 'dark'
  },
  stub: () => {
    UI.drawer = false
    toast('در این پروتوتایپ فقط «مدیر ساختمان» فعال است')
    return false
  },
  about: () => {
    UI.drawer = false
    openSheet('about')
    return false
  },
  sheetclose: () => {
    UI.sheet = null
    UI.openSel = null
  },
  seltoggle: d => {
    UI.openSel = UI.openSel === d.id ? null : d.id
  },
  selpick: d => {
    setB(d.bind, d.v)
    UI.openSel = null
    if (d.after && AFTER[d.after]) AFTER[d.after](d.v, d.bind)
  },
  tog: d => {
    setB(d.bind, !getB(d.bind))
    const a = d.bind.split('.').slice(-1)[0]
    if (AFTER['tog:' + a]) AFTER['tog:' + a]()
  },
  setf: d => {
    UI.f[d.k] = d.v
  },
  copy: d => {
    const t = d.text || ''
    try {
      navigator.clipboard.writeText(t)
    } catch (e) {}
    toast('کپی شد')
    return false
  }
})
const AFTER = {}
window.addEventListener('hashchange', () => {
  UI.sheet = null
  UI.drawer = false
  render()
})
