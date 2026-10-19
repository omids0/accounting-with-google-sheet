/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — members, roles and per-member permissions (manager only) */
'use strict'
const memberRole = m => (BUILDING_ROLES.find(r => r.value === m.roleKey) || {}).label || ''
const overridden = m => !!(m.perms && Object.keys(m.perms).length)
const managersCount = b => b.members.filter(m => m.roleKey === 'manager').length
BPAGES.members = (R, b) => {
  const me = b.meIndex || 0
  const card = (m, i) => {
    const open = UI.f['ex' + i]
    const lastMgr = m.roleKey === 'manager' && managersCount(b) === 1
    return `<div class="card"><div style="display:flex;gap:10px;align-items:center">${avatarOf(
      m.name
    )}<div style="flex:1"><b>${esc(m.name)}${i === me ? ' (شما)' : ''}</b><span class="sub">${
      m.status === 'invited' ? 'دعوت‌شده · هنوز وصل نشده' : 'فعال'
    }</span></div><span class="pill ${overridden(m) ? 'warn' : ''}">${memberRole(m)}${
      overridden(m) ? ' · سفارشی' : ''
    }</span></div>
    <div style="margin-top:10px">${sel('نقش', 'b.members.' + i + '.roleKey', BUILDING_ROLES, {
      id: 'mr' + i,
      after: 'roleChanged',
      hint: lastMgr
        ? 'آخرین مدیر است؛ نقش را فقط با تعیین مدیر دیگر می‌شود عوض کرد.'
        : ROLE_NOTE[m.roleKey]
    })}</div>
    <button class="btn sm block" data-a="setf" data-k="ex${i}" data-v="${open ? '' : '1'}">${
      open ? 'بستن دسترسی‌های دقیق' : 'دسترسی‌های دقیق ▾'
    }</button>
    ${
      open
        ? `<div style="margin-top:8px">${Object.entries(PERMS)
            .map(
              ([k, t]) =>
                `<div class="toggle"><span class="tx">${t}${
                  m.perms && k in m.perms ? ' <span class="pill warn">سفارشی</span>' : ''
                }</span><button type="button" class="sw ${
                  memberCan(m, k) ? 'on' : ''
                }" role="switch" aria-checked="${memberCan(
                  m,
                  k
                )}" data-a="memperm" data-i="${i}" data-k="${k}" ${
                  m.roleKey === 'manager' && i === me ? 'disabled style="opacity:.5"' : ''
                }></button></div>`
            )
            .join('')}
    ${
      overridden(m)
        ? `<button class="btn sm" data-a="memreset" data-i="${i}">بازگشت به پیش‌فرض نقش</button>`
        : ''
    }
    ${
      m.roleKey === 'board' && ['record', 'issue', 'people', 'settings'].some(k => memberCan(m, k))
        ? '<p class="note">این عضو در درایو فقط «مشاهده» دارد؛ برای ثبت باید دسترسی «ویرایش» هم به او داده شود.</p>'
        : ''
    }</div>`
        : ''
    }
    ${
      i !== me && !lastMgr
        ? UI.f['rm' + i]
          ? `<div class="guide" style="margin-top:8px"><b>قطع دسترسی ${esc(
              m.name
            )}؟</b>او دیگر این ساختمان را نمی‌بیند (اشتراک درایو هم باید برداشته شود).<div class="btns" style="margin-top:8px"><button class="btn" data-a="setf" data-k="rm${i}" data-v="">انصراف</button><button class="btn danger" data-a="memremove" data-i="${i}">قطع دسترسی</button></div></div>`
          : `<button class="btn danger sm" style="margin-top:8px" data-a="setf" data-k="rm${i}" data-v="1">قطع دسترسی</button>`
        : ''
    }</div>`
  }
  return {
    title: 'اعضا و دسترسی‌ها',
    back: bhash(b, 'settings'),
    html: `<p class="note">مدیر نقش هر عضو را تعیین می‌کند و در صورت نیاز دسترسی‌های دقیق را برای یک نفر کم یا زیاد می‌کند. تغییر نقش، دسترسی‌های سفارشی را به پیش‌فرض برمی‌گرداند.</p>
    <button class="btn primary block" data-a="sheet" data-n="invite">+ دعوت عضو جدید</button>
    ${b.members.map(card).join('')}`
  }
}
AFTER.roleChanged = (v, bind) => {
  const b = curB()
  const i = Number(bind.split('.')[2])
  const m = b.members[i]
  if (!b.members.some(x => x.roleKey === 'manager')) {
    m.roleKey = 'manager'
    toast('ساختمان باید حداقل یک مدیر داشته باشد')
    return
  }
  delete m.perms
  logAct(b, 'نقش ' + m.name + ' شد ' + memberRole(m))
}
ACT.memperm = d => {
  const b = curB()
  const m = b.members[Number(d.i)]
  const def = !!(ROLE_PERMS[m.roleKey] || {})[d.k]
  const now = memberCan(m, d.k)
  m.perms = m.perms || {}
  if (!now === def) delete m.perms[d.k]
  else m.perms[d.k] = !now
  if (!Object.keys(m.perms).length) delete m.perms
  logAct(b, 'دسترسی ' + m.name + ' تغییر کرد')
}
ACT.memreset = d => {
  delete curB().members[Number(d.i)].perms
}
ACT.memremove = d => {
  const b = curB()
  const i = Number(d.i)
  const m = b.members[i]
  b.members.splice(i, 1)
  if ((b.meIndex || 0) > i) b.meIndex--
  UI.f = {}
  logAct(b, 'دسترسی ' + m.name + ' قطع شد')
  toast('دسترسی ' + m.name + ' قطع شد')
}
/* settings: replace the old inline member selects by a link to the members page */
const osMembers = BPAGES.settings
BPAGES.settings = (R, b) => {
  const p = osMembers(R, b)
  p.html = p.html.replace(
    /(<div class="sec"><span>اعضا \(اشتراک درایو\)<\/span><\/div>)[\s\S]*?(?=<div class="sec"><span>فعالیت‌ها)/,
    `$1<div class="card flat"><button class="row" data-a="go" data-to="${bhash(
      b,
      'members'
    )}"><span class="t">اعضا و دسترسی‌ها<small>${b.members
      .map(m => esc(m.name) + ' (' + memberRole(m) + ')')
      .join(' · ')}</small></span>${ico(
      'left'
    )}</button></div><button class="btn block" style="margin-top:8px" data-a="sheet" data-n="invite">+ دعوت عضو</button>`
  )
  return p
}
