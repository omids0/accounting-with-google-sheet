/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — continuity: Drive-owner transfer and member backups (any role can restore) */
'use strict'
const dayNo = s => {
  const [y, m, d] = String(s).split('-').map(Number)
  return y * 372 + (m - 1) * 31 + d
}
const BACKUP_EVERY = [
  { value: 7, label: 'هر هفته' },
  { value: 14, label: 'هر ۲ هفته' },
  { value: 30, label: 'هر ماه' }
]
function cont(b) {
  if (!b.cont) {
    const own = b.members.find(m => m.roleKey === 'manager') || b.members[0]
    b.cont = {
      owner: own.name,
      backupOn: true,
      every: 7,
      keep: 4,
      copies: [{ date: TODAY, kind: 'auto' }],
      pending: null
    }
  }
  return b.cont
}
const meName = b => (meMember(b) || {}).name
const isOwner = b => cont(b).owner === meName(b)
const copyAge = b => {
  const c = cont(b)
  return c.copies.length ? dayNo(TODAY) - dayNo(c.copies[0].date) : 9999
}
function addCopy(b, kind) {
  const c = cont(b)
  c.copies.unshift({ date: TODAY, kind })
  c.copies = c.copies.slice(0, c.keep)
}
/* the real app does this when the member opens the building (or in the background on Android) */
function autoBackup(b) {
  const c = cont(b)
  if (c.backupOn && copyAge(b) >= Number(c.every)) addCopy(b, 'auto')
}
const switchRow = (text, on, attrs) =>
  `<div class="toggle"><span class="tx">${text}</span><button type="button" class="sw ${
    on ? 'on' : ''
  }" role="switch" aria-checked="${on}" ${attrs}></button></div>`

BPAGES.continuity = (R, b) => {
  const c = cont(b)
  autoBackup(b)
  const age = copyAge(b)
  const mgr = can('settings')
  const owner = isOwner(b)
  const eligible = b.members.filter(
    m => m.name !== c.owner && ['manager', 'accountant'].includes(m.roleKey)
  )
  const ownerCard = c.pending
    ? `<div class="guide warn"><b>درخواست انتقال به ${esc(
        c.pending
      )} ارسال شد</b>در Drive یک اعلان می‌رود و تا پذیرفتن او مالک همچنان ${esc(
        c.owner
      )} است.<div class="btns" style="margin-top:8px"><button class="btn" data-a="transfercancel">لغو درخواست</button><button class="btn primary" data-a="transferaccept">شبیه‌سازی: ${esc(
        c.pending
      )} پذیرفت</button></div></div>`
    : owner
    ? `<button class="btn block" data-a="sheet" data-n="transferOwner">انتقال مالکیت شیت به مدیر جدید</button><p class="note">وقتی مدیری عوض می‌شود، فقط جابه‌جایی نقش کافی نیست: فایل شیت در Drive به حساب مالک وابسته است. با انتقال، مالک جدید کنترل کامل فایل را می‌گیرد.</p>`
    : `<p class="note">فقط مالک شیت می‌تواند مالکیت را منتقل کند. اگر او در دسترس نیست، از «بازیابی از پشتیبان» پایین استفاده کن.</p>`
  const copies = c.copies
    .map(
      x =>
        `<div class="row"><span class="t">${dateFa(x.date)}<small>${
          x.kind === 'auto' ? 'خودکار' : 'دستی'
        } · در Drive شخصی تو · «پشتیبان ${esc(b.name)}»</small></span><span class="pill">${
          dayNo(TODAY) - dayNo(x.date) === 0
            ? 'امروز'
            : fa(dayNo(TODAY) - dayNo(x.date)) + ' روز پیش'
        }</span></div>`
    )
    .join('')
  return {
    title: 'پشتیبان و تحویل مدیریت',
    back: bhash(b, 'dashboard'),
    html: `<div class="guide ok"><b>داده‌های ${esc(
      b.name
    )} فقط به یک نفر وابسته نیست</b>هر عضو یک نسخهٔ پشتیبان در Drive خودش نگه می‌دارد. اگر مالک شیت در دسترس نباشد، هر عضو می‌تواند از نسخهٔ خودش ساختمان را زنده کند.</div>
    <div class="sec"><span>مالک شیت در Drive</span></div><div class="card"><div style="display:flex;gap:10px;align-items:center">${avatarOf(
      c.owner
    )}<div style="flex:1"><b>${esc(c.owner)}${
      owner ? ' (شما)' : ''
    }</b><span class="sub">مالک فایل «حسابداری · ${esc(
      b.name
    )}»</span></div><span class="pill">مالک</span></div><div style="margin-top:10px">${ownerCard}</div></div>
    <div class="sec"><span>پشتیبان خودکار برای اعضا</span></div><div class="card">
    ${
      mgr
        ? switchRow('روشن (برای همهٔ اعضا)', c.backupOn, 'data-a="backupswitch"') +
          sel('فاصلهٔ پشتیبان‌گیری', 'b.cont.every', BACKUP_EVERY, { id: 'bkevery' })
        : `<p class="note">${
            c.backupOn
              ? 'مدیر پشتیبان خودکار را روشن کرده: ' +
                (BACKUP_EVERY.find(x => x.value === Number(c.every)) || {}).label
              : 'مدیر پشتیبان خودکار را خاموش کرده است.'
          }</p>`
    }
    <p class="note">هر بار که ساختمان را باز می‌کنی و فاصله گذشته باشد، یک کپی کامل شیت در Drive خودت ساخته می‌شود. ${fa(
      c.keep
    )} نسخهٔ آخر نگه داشته می‌شود. نسخه‌ها مال خود تو هستند و به حساب مالک شیت وابسته نیستند.</p>
    ${
      age > Number(c.every) + 7
        ? `<div class="guide warn"><b>نسخهٔ تو قدیمی شده</b>آخرین پشتیبان ${fa(
            age
          )} روز پیش بود. «پشتیبان‌گیری همین حالا» را بزن.</div>`
        : ''
    }
    <div class="card flat" style="box-shadow:none">${copies}</div>
    <button class="btn block" style="margin-top:8px" data-a="backupnow">پشتیبان‌گیری همین حالا</button></div>
    <div class="sec"><span>اگر مدیر یا مالک در دسترس نیست</span></div><div class="card">
    <p class="note" style="margin-top:0">۱) از یکی از نسخه‌های بالا ساختمان جدید بساز. ۲) تو مدیر و مالک شیت جدید می‌شوی. ۳) بقیهٔ اعضا را دوباره دعوت کن. شیت قدیمی دست‌نخورده می‌ماند و اگر مالک برگشت، بایگانی‌اش کن.</p>
    <button class="btn danger block" data-a="sheet" data-n="restoreBackup">بازیابی ساختمان از پشتیبان</button></div>`
  }
}
SHEETS.transferOwner = (s, b) => {
  const c = cont(b)
  const options = b.members
    .filter(m => m.name !== c.owner && ['manager', 'accountant'].includes(m.roleKey))
    .map(m => ({ value: m.name, label: m.name + ' · ' + memberRole(m) }))
  return {
    title: 'انتقال مالکیت شیت',
    body: options.length
      ? `<p class="sub">مالک جدید باید از قبل مدیر یا حسابدار (ویرایشگر) باشد. Drive به او پیشنهاد مالکیت می‌دهد و تا وقتی نپذیرد، تو مالک می‌مانی.</p>${sel(
          'مالک جدید',
          'd.to',
          options,
          { id: 'tw' }
        )}<div class="guide" style="margin-top:8px"><b>بعد از پذیرفتن</b>مالک جدید خودکار «مدیر» هم می‌شود. نقش خودت تغییر نمی‌کند؛ اگر دیگر مدیر نیستی، از «اعضا و دسترسی‌ها» عوضش کن. پل حساب شخصی تو برای این ساختمان فقط روی دستگاه خودت می‌ماند.</div>`
      : `<div class="guide warn"><b>عضو واجد شرایط نیست</b>ابتدا مدیر یا حسابدار جدید را دعوت کن، بعد انتقال بده.</div>`,
    foot: `${closeBtn}${
      options.length
        ? '<button class="btn primary" data-a="transfergo">ارسال درخواست انتقال</button>'
        : ''
    }`
  }
}
SHEETS.restoreBackup = (s, b) => {
  const c = cont(b)
  const options = c.copies.map((x, i) => ({
    value: i,
    label: dateFa(x.date) + (x.kind === 'auto' ? ' · خودکار' : ' · دستی')
  }))
  return {
    title: 'بازیابی از پشتیبان',
    body: `<p class="sub">از نسخهٔ انتخاب‌شده یک ساختمان جدید با شیت تازه در Drive تو ساخته می‌شود. همهٔ واحدها، ساکنان، شارژها و صندوق تا تاریخ آن نسخه می‌آید.</p>${sel(
      'نسخه',
      'd.pick',
      options,
      { id: 'rb' }
    )}<div class="guide warn" style="margin-top:8px"><b>یادت باشد</b>تغییرهایی که بعد از تاریخ نسخه ثبت شده‌اند در آن نیست. بقیهٔ اعضا باید دوباره دعوت شوند.</div>`,
    foot: `${closeBtn}<button class="btn danger" data-a="restoredo">ساخت ساختمان از این نسخه</button>`
  }
}
ACT.backupswitch = () => {
  const c = cont(curB())
  c.backupOn = !c.backupOn
  logAct(curB(), 'پشتیبان خودکار ' + (c.backupOn ? 'روشن' : 'خاموش') + ' شد')
}
ACT.backupnow = () => {
  addCopy(curB(), 'manual')
  toast('نسخهٔ پشتیبان در Drive تو ذخیره شد')
}
ACT.transfergo = () => {
  const b = curB()
  const to = UI.sheet.d.to
  if (!to) return toast('مالک جدید را انتخاب کنید'), false
  cont(b).pending = to
  logAct(b, 'درخواست انتقال مالکیت شیت به ' + to)
  UI.sheet = null
  toast('درخواست برای ' + to + ' ارسال شد')
  return false
}
ACT.transfercancel = () => {
  cont(curB()).pending = null
  toast('درخواست انتقال لغو شد')
}
ACT.transferaccept = () => {
  const b = curB()
  const c = cont(b)
  const m = b.members.find(x => x.name === c.pending)
  if (m) m.roleKey = 'manager'
  logAct(b, 'مالکیت شیت به ' + c.pending + ' منتقل شد')
  c.owner = c.pending
  c.pending = null
  toast('مالکیت منتقل شد')
}
ACT.restoredo = () => {
  const b = curB()
  const i = Number(UI.sheet.d.pick || 0)
  const c = cont(b)
  const copy = c.copies[i] || c.copies[0]
  const nb = JSON.parse(JSON.stringify(b))
  const me = meMember(b)
  nb.id = uid('b')
  nb.name = b.name + ' (بازیابی‌شده)'
  nb.members = nb.members.map(m => ({
    ...m,
    me: m.name === me.name,
    roleKey: m.name === me.name ? 'manager' : m.roleKey === 'manager' ? 'board' : m.roleKey,
    status: m.name === me.name ? undefined : 'invited'
  }))
  nb.meIndex = nb.members.findIndex(m => m.name === me.name)
  nb.cont = { ...nb.cont, owner: me.name, pending: null, copies: [{ date: TODAY, kind: 'manual' }] }
  logAct(nb, 'بازیابی از نسخهٔ ' + dateFa(copy.date) + ' · اعضا باید دوباره دعوت شوند')
  S.buildings.push(nb)
  UI.sheet = null
  go('#/b/' + nb.id + '/dashboard')
  toast('ساختمان از پشتیبان ساخته شد · اعضا را دوباره دعوت کن')
  return false
}
/* settings (manager): a row that opens the page */
const osContinuity = BPAGES.settings
BPAGES.settings = (R, b) => {
  const p = osContinuity(R, b)
  const c = cont(b)
  p.html = p.html.replace(
    '<div class="sec"><span>فعالیت‌ها</span></div>',
    `<div class="sec"><span>پشتیبان و تحویل مدیریت</span></div><div class="card flat"><button class="row" data-a="go" data-to="${bhash(
      b,
      'continuity'
    )}"><span class="t">پشتیبان اعضا و انتقال شیت<small>مالک: ${esc(c.owner)} · پشتیبان ${
      c.backupOn ? 'روشن' : 'خاموش'
    }</small></span>${ico('left')}</button></div><div class="sec"><span>فعالیت‌ها</span></div>`
  )
  return p
}
