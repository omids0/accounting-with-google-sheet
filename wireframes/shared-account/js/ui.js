/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Small HTML builders that mirror the app's components (Button, FormField, Select, ToggleSwitch,
   Alert, FormModal, ConfirmActionModal, the header and the two bottom bars). */
function header(title, o) {
  o = o || {}
  var end = o.back
    ? `<button class="hbtn" data-act="${o.back}" aria-label="بازگشت">${ic('back')}</button>`
    : `<button class="hbtn" aria-label="حالت خصوصی">${ic(
        'eye'
      )}</button><button class="hbtn" aria-label="جستجو">${ic('search')}</button>`
  return `<header class="hdr"><button class="hbtn" aria-label="منو">${ic(
    'menu'
  )}</button><div class="ttl"><h2>${title}</h2><span class="sync">همگام شد</span></div>${end}</header>`
}
function btn(label, act, cls, extra) {
  return `<button type="button" class="btn ${cls || ''}" data-act="${act}" ${
    extra || ''
  }>${label}</button>`
}
function field(label, inner, o) {
  o = o || {}
  return `<div class="field"><label ${o.id ? `for="${o.id}"` : ''} class="${
    o.req ? 'req' : ''
  }">${label}</label>${inner}${o.hint ? `<p class="hint">${o.hint}</p>` : ''}</div>`
}
function input(id, value, attrs) {
  return `<input class="inp" id="${id}" value="${esc(value)}" ${attrs || ''} />`
}
function select(id, options, value, attrs) {
  var opts = options
    .map(function (o) {
      var v = Array.isArray(o) ? o[0] : o,
        l = Array.isArray(o) ? o[1] : o
      return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${l}</option>`
    })
    .join('')
  return `<select class="inp" id="${id}" ${attrs || ''}>${opts}</select>`
}
/* The money input: «تومان» inside, the amount in words below (dashed box). */
function moneyField(id, label, amount, req) {
  var inner = `<div class="money"><input class="inp" id="${id}" inputmode="numeric" value="${
    amount ? money(amount) : ''
  }" placeholder="۰" /><span>تومان</span></div><div class="words" id="${id}-w">${
    amount ? words(amount) : '—'
  }</div>`
  return field(label, inner, { id: id, req: req })
}
function seg(act, options, value, label) {
  return `<div class="seg" role="group" aria-label="${label || ''}">${options
    .map(function (o) {
      return `<button type="button" data-act="${act}" data-v="${o[0]}" aria-pressed="${o[0] === value}">${o[1]}</button>`
    })
    .join('')}</div>`
}
function sw(act, on, label, o) {
  o = o || {}
  return `<button type="button" class="sw" role="switch" aria-checked="${!!on}" aria-label="${label}" data-act="${act}" ${
    o.v ? `data-v="${o.v}"` : ''
  } ${o.disabled ? 'disabled' : ''}></button>`
}
function alertBox(text, kind, extra) {
  return `<p class="alert ${kind || ''}" role="${kind === 'bad' ? 'alert' : 'status'}">${text}${
    extra || ''
  }</p>`
}
function sheet(title, body, foot) {
  return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="grab"></div><div class="sh-h"><h3>${title}</h3><button type="button" class="xbtn" data-act="close" aria-label="بستن">${ic(
    'x',
    20
  )}</button></div><div class="sh-b">${body}</div>${
    foot
      ? `<div class="sh-f ${
          foot.indexOf('<button') === foot.lastIndexOf('<button') ? 'one' : ''
        }">${foot}</div>`
      : ''
  }</div>`
}
/* ConfirmActionModal: a message (with line breaks) and two buttons. */
function confirmSheet(title, msg, ok, okAct, cancel, cancelAct, okCls) {
  return sheet(
    title,
    `<p class="msg">${msg}</p>`,
    btn(ok, okAct, okCls || '') + (cancel ? btn(cancel, cancelAct || 'close', 'sec') : '')
  )
}
function sharedNav(active) {
  var tabs = [
    ['home', 'خانه', 'grid'],
    ['records', 'ثبت‌ها', 'list'],
    ['settle', 'تسویه', 'swap'],
    ['members', 'اعضا', 'users']
  ]
  return tabs
    .map(function (t) {
      return `<button type="button" data-act="go" data-v="${
        t[0]
      }" ${t[0] === active ? 'aria-current="page"' : ''}>${ic(t[2])}${t[1]}</button>`
    })
    .join('')
}
function personalNav() {
  var items = [
    ['اقساط', 'cal'],
    ['بدهی', 'debt'],
    ['چک‌ها', 'cheque'],
    ['داشبورد', 'grid'],
    ['طلب‌ها', 'hand'],
    ['صندوقچه', 'box'],
    ['کیف پول', 'wallet']
  ]
  return items
    .map(function (t) {
      var dash = t[0] === 'داشبورد'
      return `<button type="button" ${
        dash ? 'class="dash" data-act="go" data-v="plist"' : 'data-act="noop"'
      }>${ic(t[1], dash ? 24 : 20)}${t[0]}</button>`
    })
    .join('')
}
/* SharedNoticeBanner: one card per notice with «بررسی». `who` names the editor. */
function noticeCards(who) {
  return myNotices()
    .map(function (n) {
      var change =
        n.kind === 'edit' ? `: از ${noticeValue(n, n.old)} به ${noticeValue(n, n.new)}` : ''
      return `<div class="card guide" role="note"><span class="ico">${ic(
        'bell',
        20
      )}</span><b>${noticeSentence(n, who(n.by))}${change}</b>${btn('بررسی', 'notice', 'sec sm', `data-v="${n.id}"`)}</div>`
    })
    .join('')
}
function avatar(email, cls) {
  return `<span class="av ${cls || ''}" role="img" aria-label="${email}" title="${email}">${(NAMES[
    email
  ] && cls
    ? NAMES[email][0]
    : email[0]
  ).toUpperCase()}</span>`
}
