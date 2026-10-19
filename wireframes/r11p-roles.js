/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — roles and permissions (manager / accountant / board member) */
'use strict'
const PERMS = {
  record: 'ثبت پرداخت، هزینه، درآمد، چک، پیامک و تسویه',
  issue: 'صدور دستی شارژ',
  autoIssue: 'صدور خودکار شارژ',
  people: 'ویرایش واحدها، ساکنان و طرف حساب‌ها',
  settings: 'تنظیمات، فهرست‌ها، اعضا و حذف اتصال'
}
/* BUILDING_ROLES in core: manager, accountant, board. Reports, lists and statements are readable by everyone. */
const ROLE_PERMS = {
  manager: { record: 1, issue: 1, autoIssue: 1, people: 1, settings: 1 },
  accountant: { record: 1, issue: 1, people: 1 },
  board: {}
}
const ROLE_NOTE = {
  manager: 'همهٔ کارها؛ صدور خودکار؛ تنظیمات و اعضا. دسترسی درایو: ویرایش.',
  accountant:
    'کار روزمره: پرداخت، هزینه، پیامک، صدور دستی، ویرایش واحدها. بدون تنظیمات. دسترسی درایو: ویرایش.',
  board: 'فقط مشاهده و گزارش‌گیری برای نظارت. دسترسی درایو: فقط مشاهده.'
}
const ACTION_PERMS = {
  payopen: 'record',
  paynext: 'record',
  paysave: 'record',
  saveexp: 'record',
  delexp: 'record',
  editamt: 'record',
  askdel: 'record',
  saveamt: 'record',
  saveinc: 'record',
  savecheck: 'record',
  passcheck: 'record',
  dosettle: 'record',
  smspay: 'record',
  smsall: 'record',
  smsexp: 'record',
  smsignore: 'record',
  doissue: 'issue',
  applychange: 'people',
  exitres: 'people',
  changeres: 'people',
  saveunit: 'people',
  saveperson: 'people',
  fillopen: 'people',
  fillsave: 'people',
  quickbuild: 'people',
  removeb: 'settings',
  savereconcile: 'record',
  saveaccount: 'settings',
  memperm: 'settings',
  memreset: 'settings',
  memremove: 'settings',
  saveopening: 'settings',
  saveprev: 'people',
  saveinvite: 'settings',
  setupskip: 'settings',
  addlist: 'settings'
}
const SHEET_PERMS = {
  unitForm: 'people',
  issue: 'issue',
  expenseForm: 'record',
  incomeForm: 'record',
  personForm: 'people',
  checkForm: 'record',
  settleDang: 'record',
  quick: 'people',
  addRes: 'people',
  lists: 'settings',
  removeB: 'settings',
  reconcile: 'record',
  accountForm: 'settings',
  opening: 'settings',
  prevDebts: 'people',
  invite: 'settings'
}
const PAGE_PERMS = { sms: 'record', settings: 'settings', members: 'settings' }
const memberCan = (m, perm) =>
  m.perms && perm in m.perms ? !!m.perms[perm] : !!(ROLE_PERMS[m.roleKey] || {})[perm]
const meMember = b => (b && b.members ? b.members[b.meIndex || 0] : null)
const roleOf = b => (meMember(b) && meMember(b).roleKey) || (b && b.myRole) || 'manager'
const can = perm => {
  const b = curB()
  if (!b) return true
  const m = meMember(b)
  return m ? memberCan(m, perm) : !!(ROLE_PERMS[roleOf(b)] || {})[perm]
}
const roleName = b => (BUILDING_ROLES.find(r => r.value === roleOf(b)) || {}).label || ''
const denied = () => toast('این کار با نقش «' + roleName(curB()) + '» مجاز نیست')
const permOfFab = f => {
  if (f.a === 'sheet') {
    const m = String(f.data || '').match(/data-n="(\w+)"/)
    return m ? SHEET_PERMS[m[1]] : null
  }
  return ACTION_PERMS[f.a]
}
const allowedFab = f => {
  const p = permOfFab(f)
  return !p || can(p)
}
/* guard every gated action, whichever way it is reached (click or ?s= link) */
Object.keys(ACTION_PERMS).forEach(k => {
  const orig = ACT[k]
  if (!orig) return
  ACT[k] = (d, el) => {
    if (!can(ACTION_PERMS[k])) return denied(), false
    return orig(d, el)
  }
})
const origSheet = ACT.sheet
ACT.sheet = (d, el) => {
  const p = SHEET_PERMS[d.n]
  if (p && !can(p)) return denied(), false
  return origSheet(d, el)
}
/* hide controls the current role cannot use (after each render) */
function applyRoleGates(root) {
  root.querySelectorAll('[data-a]').forEach(el => {
    const a = el.dataset.a
    const p = a === 'sheet' ? SHEET_PERMS[el.dataset.n] : ACTION_PERMS[a]
    if (p && !can(p)) el.style.display = 'none'
  })
}
const roleBanner = b => {
  const r = roleOf(b)
  return r === 'manager'
    ? ''
    : `<div class="guide ok"><b>نقش شما: ${roleName(b)}</b>${ROLE_NOTE[r]}</div>`
}

const origDash = BPAGES.dashboard
BPAGES.dashboard = (R, b) => {
  const p = origDash(R, b)
  p.html = roleBanner(b) + p.html
  return p
}
const origSettings = BPAGES.settings
BPAGES.settings = (R, b) => {
  const p = origSettings(R, b)
  const cols = BUILDING_ROLES
  const matrix = `<div class="sec"><span>نقش‌ها و دسترسی‌ها</span></div><div class="card"><table class="tbl"><tr><th>کار</th>${cols
    .map(c => '<th>' + c.label + '</th>')
    .join('')}</tr>
  ${Object.entries(PERMS)
    .map(
      ([k, t]) =>
        '<tr><td>' +
        t +
        '</td>' +
        cols.map(c => '<td>' + (ROLE_PERMS[c.value][k] ? '✓' : '—') + '</td>').join('') +
        '</tr>'
    )
    .join('')}
  <tr><td>گزارش‌ها، صورت‌حساب‌ها و فهرست‌ها (مشاهده)</td>${cols
    .map(() => '<td>✓</td>')
    .join('')}</tr></table>
  <p class="note">اپ این محدودیت‌ها را در رابط اعمال می‌کند. دسترسی واقعی داده را درایو تعیین می‌کند: مدیر و حسابدار «ویرایش»، عضو هیئت مدیره «فقط مشاهده».</p></div>`
  p.html = p.html.replace(
    '<div class="sec"><span>اعضا (اشتراک درایو)</span></div>',
    matrix + '<div class="sec"><span>اعضا (اشتراک درایو)</span></div>'
  )
  return p
}
