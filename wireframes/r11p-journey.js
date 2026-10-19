/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — one guided journey from «ساختمان جدید» to a final summary */
'use strict'
const JSTEPS = [
  { k: 'profile', t: 'مشخصات' },
  { k: 'fund', t: 'صندوق و شارژ' },
  { k: 'units', t: 'واحدها' },
  { k: 'people', t: 'مالک و ساکنان' },
  { k: 'debts', t: 'بدهی قبلی' },
  { k: 'issue', t: 'شارژ اول' },
  { k: 'invite', t: 'دعوت اعضا' },
  { k: 'summary', t: 'جمع‌بندی' }
]
const SHEET_STEP = {
  quick: 'units',
  fillUnits: 'people',
  fillDone: 'people',
  opening: 'fund',
  prevDebts: 'debts',
  issue: 'issue',
  invite: 'invite',
  journeySummary: 'summary'
}
function journeyBar(key) {
  const i = JSTEPS.findIndex(s => s.k === key)
  return `<div class="jbar" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>قدم ${fa(
    i + 1
  )} از ${fa(JSTEPS.length)}</b><span class="pill">${
    JSTEPS[i].t
  }</span></div><div class="steps" style="gap:4px">${JSTEPS.map(
    (s, k) => `<i class="${k <= i ? 'on' : ''}"></i>`
  ).join('')}</div></div>`
}
/* called by the sheet frame: add the stepper (and a back button) while the journey is running */
function journeyWrap(s, name, b) {
  const key = SHEET_STEP[name]
  if (!b || !b.journey || !key) return
  s.body = journeyBar(key) + s.body
  if (['debts', 'issue', 'invite', 'summary'].includes(key))
    s.foot = `<button class="btn" data-a="journeyback">قبلی</button>` + (s.foot || '')
}
ACT.journeyback = () => {
  const b = curB()
  const key = SHEET_STEP[UI.sheet.name]
  const prev = {
    debts: () => openSheet('fillDone'),
    issue: () => ACT.sheet({ n: 'prevDebts' }),
    invite: () => ACT.sheet({ n: 'issue' }),
    summary: () => ACT.sheet({ n: 'invite' })
  }[key]
  UI.sheet = null
  if (prev) prev()
  return false
}
function goNextStep(b) {
  const n = nextStep(b)
  UI.sheet = null
  if (n) {
    n.go()
    return false
  }
  if (b.journey) {
    openSheet('journeySummary')
    return false
  }
  go('#/b/' + b.id + '/dashboard')
  toast('راه‌اندازی کامل شد · از این ماه به بعد شارژ هر ماه خودکار صادر می‌شود')
  return false
}
function summaryText(b) {
  const lm = chargeMonths(b)[0]
  const ms = lm ? monthSummary(b, lm) : null
  return [
    'خلاصهٔ راه‌اندازی ' + b.name,
    'نشانی: ' + (b.address || '—'),
    fa(b.units.length) + ' واحد در ' + fa(b.floors) + ' طبقه',
    'صندوق: ' + b.accounts.map(a => a.name + ' ' + money(a.balance)).join(' · '),
    'شارژ پیش‌فرض ' +
      money(b.profile.defaultCharge) +
      ' (' +
      CHARGE_METHODS.find(m => m.value === b.profile.method).label.split(' (')[0] +
      ') · صدور روز ' +
      fa(b.profile.issueDay) +
      ' · سررسید روز ' +
      fa(b.profile.dueDay),
    ms
      ? 'شارژ ' + monthLabel(lm) + ' برای ' + fa(ms.units) + ' واحد صادر شد: ' + money(ms.billed)
      : 'شارژ هنوز صادر نشده',
    'اعضا: ' +
      b.members
        .map(
          m => m.name + ' (' + (BUILDING_ROLES.find(r => r.value === m.roleKey) || {}).label + ')'
        )
        .join('، ')
  ].join('\n')
}
SHEETS.journeySummary = (s, b) => {
  const lm = chargeMonths(b)[0]
  const ms = lm ? monthSummary(b, lm) : null
  const cnt = { owner: 0, tenant: 0, vacant: 0 }
  b.units.forEach(u => {
    const st = occupantStay(b, u.id)
    cnt[!st ? 'vacant' : st.role === 'tenant' ? 'tenant' : 'owner']++
  })
  const prev = b.rec
    .filter(r => (r.ref || '').startsWith('opening:'))
    .reduce((a, r) => a + r.amount, 0)
  const row = (k, v) =>
    `<div class="row"><span class="t muted">${k}</span><span class="amt" style="direction:rtl;text-align:left">${v}</span></div>`
  return {
    title: 'جمع‌بندی راه‌اندازی',
    full: true,
    body: `<div class="guide ok"><b>«${esc(
      b.name
    )}» آماده است ✓</b>همهٔ قدم‌ها انجام شد. این خلاصه را بررسی کن و وارد داشبورد شو.</div>
    <div class="sec"><span>ساختمان</span></div><div class="card flat">${row(
      'نشانی',
      esc(b.address || '—')
    )}${row('واحد و طبقه', fa(b.units.length) + ' واحد · ' + fa(b.floors) + ' طبقه')}${row(
      'سکونت',
      'مالک ساکن ' + fa(cnt.owner) + ' · مستأجر ' + fa(cnt.tenant) + ' · خالی ' + fa(cnt.vacant)
    )}</div>
    <div class="sec"><span>صندوق</span></div><div class="card flat">${b.accounts
      .map(a => row(esc(a.name), money(a.balance)))
      .join('')}${row('جمع', '<b>' + money(sumAcc(b)) + '</b>')}</div>
    <div class="sec"><span>شارژ</span></div><div class="card flat">${row(
      'شارژ پیش‌فرض',
      money(b.profile.defaultCharge)
    )}${row(
      'روش',
      CHARGE_METHODS.find(m => m.value === b.profile.method).label.split(' (')[0]
    )}${row(
      'صدور و سررسید',
      'روز ' + fa(b.profile.issueDay) + ' · روز ' + fa(b.profile.dueDay)
    )}${row('واحد خالی', VACANCY_RULES.find(v => v.value === b.profile.vacancy).label)}${
      ms
        ? row('شارژ ' + monthName(lm), money(ms.billed) + ' · ' + fa(ms.units) + ' واحد')
        : row('شارژ اول', 'صادر نشده')
    }${prev ? row('بدهی‌های قبلی', money(prev)) : ''}</div>
    <div class="sec"><span>اعضا</span></div><div class="card flat">${b.members
      .map(m => row(esc(m.name), (BUILDING_ROLES.find(r => r.value === m.roleKey) || {}).label))
      .join('')}</div>
    <div class="card" style="margin-top:10px"><b>از این به بعد</b><span class="sub">شارژ هر ماه روز ${fa(
      b.profile.issueDay
    )} خودکار صادر می‌شود. پرداخت‌ها را از صفحهٔ واحد یا «پیامک بانکی» ثبت کن. موجودی صندوق را از «صندوق ← تطبیق موجودی» با بانک یکی کن. نقش اعضا را از «تنظیمات ← اعضا و دسترسی‌ها» تغییر بده.</span></div>`,
    foot: `<button class="btn" data-a="journeycopy">${ico(
      'share',
      'sm'
    )} اشتراک خلاصه</button><button class="btn primary" data-a="journeyfinish">رفتن به داشبورد</button>`
  }
}
ACT.journeycopy = () => {
  const t = summaryText(curB())
  try {
    navigator.clipboard.writeText(t)
  } catch (e) {}
  toast('خلاصه کپی شد')
  return false
}
ACT.journeyfinish = () => {
  const b = curB()
  b.journey = false
  UI.sheet = null
  go('#/b/' + b.id + '/dashboard')
  toast('«' + b.name + '» آمادهٔ استفاده است')
  return false
}
ACT.saveinvite = () => {
  const b = curB()
  const d = UI.sheet.d
  if (!String(d.name || '').trim()) return toast('نام یا ایمیل را وارد کنید'), false
  const role = d.role || 'accountant'
  b.members.push({ name: d.name.trim(), roleKey: role, status: 'invited' })
  b.setup = b.setup || {}
  b.setup.invite = true
  logAct(b, 'دعوت ' + d.name.trim())
  const label = (BUILDING_ROLES.find(r => r.value === role) || {}).label
  const text =
    'سلام، شیت «حسابداری · ' +
    b.name +
    '» را با شما به اشتراک گذاشتم. نقش شما: ' +
    label +
    '. در اپ از «مدیر ساختمان ← اتصال به شیت موجود» وصلش کنید.'
  try {
    navigator.clipboard.writeText(text)
  } catch (e) {}
  if (b.journey) {
    toast('دعوت ثبت و متن آن کپی شد')
    return goNextStep(b)
  }
  UI.sheet = null
  openSheet('textShare', {}, { text, title: 'متن دعوت' })
  return false
}

/* default monthly charge of a unit by the building method (no vacancy factor); used to prefill forms */
function baseChargeFor(b, area, people) {
  const p = b.profile
  const act = b.units.filter(u => u.active)
  if (p.method === 'area') {
    const avg = act.length ? act.reduce((s, u) => s + u.area, 0) / act.length : area
    return round1000((p.defaultCharge * area) / avg)
  }
  if (p.method === 'people') {
    const avg = act.length ? act.reduce((s, u) => s + u.people, 0) / act.length : people
    return round1000((p.defaultCharge * people) / avg)
  }
  return p.defaultCharge
}
