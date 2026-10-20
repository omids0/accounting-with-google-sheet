/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — personal pages + building dashboard, units, residents, charges */
'use strict'
const PPAGES = {}
const BPAGES = {}
const SHEETS = {}
const sumAcc = b => b.accounts.reduce((s, a) => s + a.balance, 0)
const flowIn = (b, mk) =>
  b.recs.filter(r => r.type === 'income' && r.date.startsWith(mk)).reduce((s, r) => s + r.amount, 0)
const flowOut = (b, mk) =>
  b.recs
    .filter(r => r.type === 'expense' && r.date.startsWith(mk))
    .reduce((s, r) => s + r.amount, 0)
const roleLabel = v => (RESIDENT_ROLES.find(r => r.value === v) || {}).label || ''
const debtorUnits = b => b.units.filter(u => unitBalance(b, u.id).open > 0)
const dangOpen = b => b.dang.filter(d => !d.paid)
const latestMonth = b => chargeMonths(b)[0] || null
const bhash = (b, pg, arg) => `#/b/${b.id}/${pg}${arg ? '/' + arg : ''}`
const amtCls = n => (n > 0 ? 'neg' : 'pos')
const stepbar = n => journeyBar(n === 1 ? 'profile' : 'fund')
const emptyBox = (t, s, btn) =>
  `<div class="empty"><b>${t}</b>${s}${
    btn ? `<div style="margin-top:10px">${btn}</div>` : ''
  }</div>`
const avatarOf = n => `<span class="badge circle">${esc((n || '؟')[0])}</span>`
function unitLine(b, u) {
  const occ = occupantOf(b, u)
  const owner = personById(b, u.ownerId)
  const who = occ ? `${esc(occ.person.name)} · ${roleLabel(occ.role)}` : 'خالی'
  const ownerTxt = !occ || occ.role === 'tenant' ? ` · مالک: ${esc(owner ? owner.name : '—')}` : ''
  const bal = unitBalance(b, u.id)
  const st =
    bal.open > 0
      ? ` · ${fa(bal.months.length)} ماه${bal.partial ? ' (ناقص)' : ''} بدهکار`
      : bal.credit
      ? ` · اعتبار ${money(bal.credit)}`
      : ''
  return {
    who: who + ownerTxt,
    meta: `ط${fa(u.floor)} · ${fa(u.area)} متر · ${fa(u.people)} نفر · پارکینگ ${fa(
      u.parking
    )} · شارژ ${money(unitCharge(b, u))}${st}`,
    bal
  }
}
function unitRowHTML(b, u) {
  const { who, meta, bal } = unitLine(b, u)
  return `<button class="row" data-a="go" data-to="${bhash(b, 'unit', u.id)}"><span class="badge ${
    bal.open > 0 ? 'debt' : ''
  }">${fa(u.no)}</span><span class="t">${who}<small>${meta}</small></span><span class="amt ${
    bal.open > 0 ? 'neg' : 'pos'
  }">${bal.open > 0 ? '‎−' + money(bal.open) : '✓'}</span></button>`
}

/* ================= personal zone ================= */
PPAGES.dashboard = () => {
  const total = S.pb.accounts.reduce((s, a) => s + a.balance, 0)
  const nudges = S.buildings
    .map(b => {
      const d = debtorUnits(b).length
      const miss = missingIssueMonths(b)
      if (!d && !miss.length) return ''
      return `<button class="guide" style="text-align:right;width:100%;font:inherit;color:inherit" data-a="go" data-to="${bhash(
        b,
        'dashboard'
      )}"><b>${esc(b.name)}</b>${d ? fa(d) + ' واحد بدهکار' : ''}${d && miss.length ? ' · ' : ''}${
        miss.length ? 'شارژ ' + monthName(miss[0]) + ' صادر نشده' : ''
      }<span class="sub">لمس کنید تا وارد فضای ساختمان شوید</span></button>`
    })
    .join('')
  const myRec = S.pb.receivables
    .map(
      r =>
        `<div class="row"><span class="t">${esc(r.title)}<small>${esc(
          r.note
        )}</small></span><span class="amt ${r.paid >= r.amount ? 'pos' : ''}">${
          r.paid >= r.amount ? 'دریافت شد ✓' : money(r.amount - r.paid)
        }</span></div>`
    )
    .join('')
  const recs = S.pb.recs
    .slice(0, 6)
    .map(
      r =>
        `<div class="row"><span class="t">${esc(r.title)}<small>${esc(r.cat || '')} · ${dateFa(
          r.date
        )}</small></span><span class="amt ${r.type === 'income' ? 'pos' : 'neg'}">${
          r.type === 'income' ? '+' : '‎−'
        }${money(r.amount)}</span></div>`
    )
    .join('')
  return {
    title: 'داشبورد',
    sub: 'حساب شخصی',
    html: `<div class="hero"><small>دارایی قابل اتکا (شخصی)</small><div class="big num">${money(
      total
    )}</div><div class="delta">فقط حساب‌های شخصی — صندوق ساختمان‌ها اینجا حساب نمی‌شود</div></div>
    ${nudges}
    <div class="sec"><span>طلب‌های من از ساختمان‌ها</span></div>
    <div class="card flat">${
      myRec ||
      '<div class="row"><span class="t muted">طلبی ثبت نشده — هزینهٔ «جیب مدیر» با تیک پل، اینجا طلب می‌سازد</span></div>'
    }</div>
    <div class="sec"><span>آخرین رکوردهای شخصی</span></div><div class="card flat">${recs}</div>
    <p class="note">کارت یادآور ساختمان فقط از روز ۱۰ ماه و فقط وقتی کاری مانده نشان داده می‌شود؛ در پروتوتایپ همیشه نمایش داده می‌شود.</p>`
  }
}
function buildingCard(b) {
  const lm = latestMonth(b)
  const ms = lm ? monthSummary(b, lm) : null
  const miss = missingIssueMonths(b)
  const debt = debtorUnits(b)
  const debtSum = debt.reduce((s, u) => s + unitBalance(b, u.id).open, 0)
  const pct = ms && ms.billed ? Math.round((ms.paid / ms.billed) * 100) : 0
  return `<div class="card"><div style="display:flex;gap:10px;align-items:center"><span class="badge">${ico(
    'building'
  )}</span><div style="flex:1"><b>${esc(b.name)}</b><span class="sub">${fa(
    b.units.length
  )} واحد · شما + ${fa(b.members.length - 1)} عضو</span></div></div>
  <div class="stats" style="margin-top:10px;grid-template-columns:1fr 1fr 1fr"><div class="stat"><small>بدهکار</small><b>${fa(
    debt.length
  )} واحد</b><small class="neg">${money(debtSum)}</small></div>
  <div class="stat"><small>${
    miss.length ? 'شارژ ' + monthName(miss[0]) : lm ? 'شارژ ' + monthName(lm) : 'شارژ'
  }</small>${
    miss.length
      ? `<b style="color:var(--color-warning)">صادر نشده</b><small>روز ${fa(
          b.profile.issueDay
        )}</small>`
      : ms
      ? `<b>${fa(ms.units - ms.openUnits)} از ${fa(ms.units)}</b><small>وصول ${fa(pct)}٪</small>`
      : '<b>—</b>'
  }</div>
  <div class="stat"><small>صندوق</small><b>${money(sumAcc(b))}</b><small>${fa(
    b.accounts.length
  )} حساب</small></div></div>
  <div class="btns" style="margin-top:10px"><button class="btn primary" data-a="go" data-to="${bhash(
    b,
    'dashboard'
  )}">ورود</button></div></div>`
}
PPAGES.buildings = () => {
  const cards = S.buildings.map(buildingCard).join('')
  const empty = emptyBox(
    'هنوز ساختمانی نداری',
    'هر ساختمان یک دفتر جدا می‌شود: صندوق، واحدها، ساکنان و هزینه‌هایش از حساب شخصی‌ات کاملاً جداست و می‌توانی با هیئت مدیره به اشتراک بگذاری.',
    `<button class="btn primary" data-a="newbuilding">+ ساختمان جدید</button>`
  )
  return {
    title: 'مدیر ساختمان',
    sub: 'حساب شخصی',
    html: `${S.buildings.length ? cards : empty}
    <div class="card flat"><button class="row" data-a="sheet" data-n="connect"><span class="t">اتصال به شیت موجود<small>اگر مدیر قبلی یا هیئت مدیره شیت ساختمان را با شما به اشتراک گذاشته</small></span>${ico(
      'left'
    )}</button></div>
    ${
      S.buildings.length
        ? ''
        : '<p class="note">بعد از ساخت اولین ساختمان، این صفحه فهرست کارت‌ها می‌شود.</p>'
    }`,
    fab: S.buildings.length ? [{ a: 'newbuilding', label: '+ ساختمان جدید' }] : null
  }
}
function wizDefaults() {
  return {
    name: 'ساختمان نرگس ۲',
    address: '',
    floors: 5,
    units: 12,
    role: 'manager',
    accounts: [{ id: 'w1', name: 'ملت · صندوق', type: 'bank', card: '', bal: 0 }],
    charge: 1200000,
    method: 'fixed',
    issueDay: '1',
    dueDay: '10',
    vacancy: 'half'
  }
}
ACT.newbuilding = () => {
  UI.w.nb = wizDefaults()
  UI.drawer = false
  go('#/p/new/1')
  return false
}
PPAGES.new = R => {
  if (!UI.w.nb) UI.w.nb = wizDefaults()
  const step = R.arg === '2' ? 2 : 1
  const v = UI.w.nb
  if (step === 1)
    return {
      title: 'ساختمان جدید',
      back: '#/p/buildings',
      html: `${stepbar(1)}<div class="card">
      ${txt('نام ساختمان', 'w.nb.name')}${txt('نشانی', 'w.nb.address', {
        ph: 'ولنجک، کوچهٔ ۴، پلاک ۱۲'
      })}
      <div class="grid2">${txt('تعداد طبقه', 'w.nb.floors', { num: 1 })}${txt(
        'تعداد واحد',
        'w.nb.units',
        { num: 1 }
      )}</div>
      <p class="note">سازندهٔ ساختمان خودکار «مدیر» است؛ بقیه را بعداً در تنظیمات دعوت می‌کنی و نقش می‌دهی.</p></div>
      <div class="sec"><span>شیت این ساختمان</span></div><div class="card">
      <div class="guide"><b>شیت جدید و جدا · «حسابداری · ${esc(
        v.name || '…'
      )}»</b>برای این ساختمان یک شیت تازه در Google Drive خودت ساخته می‌شود؛ دفتر شخصی‌ات دست نمی‌خورد. هیئت مدیره و حسابدار را بعداً با دسترسی همین شیت دعوت می‌کنی.</div>
      <button class="row" data-a="sheet" data-n="connect"><span class="t">شیت ساختمان از قبل داری؟<small>اتصال به شیت موجود، به‌جای ساخت شیت جدید</small></span>${ico(
        'left'
      )}</button></div>
      <p class="note">با «بعدی» هنوز چیزی ساخته نمی‌شود؛ شیت در پایان قدم ۲ ساخته می‌شود.</p>
      <button class="btn primary block" data-a="wiz1">بعدی</button>`
    }
  return {
    title: 'ساختمان جدید',
    back: '#/p/new/1',
    html: `${stepbar(
      2
    )}<div class="sec"><span>صندوق ساختمان · حساب‌ها</span></div><div class="card">
    ${txt('نام حساب بانکی صندوق', 'w.nb.accName')}${txt('شمارهٔ کارت', 'w.nb.accCard', {
      tel: 1,
      ph: '۶۱۰۴۳۳۷۰۰۰۰۰۳۲۱۰',
      hint: 'پیامک‌های این کارت به این ساختمان می‌آیند'
    })}
    ${txt('موجودی فعلی این حساب (تومان)', 'w.nb.accBal', { amount: 1, num: 1 })}${txt(
      'حساب دیگر (اختیاری، مثلاً نقد سرایدار)',
      'w.nb.extra'
    )}${
      v.extra ? txt('موجودی فعلی حساب دوم (تومان)', 'w.nb.extraBal', { amount: 1, num: 1 }) : ''
    }</div>
    <div class="sec"><span>شارژ</span></div><div class="card">
    ${txt('شارژ پیش‌فرض (تومان)', 'w.nb.charge', { amount: 1, num: 1 })}${sel(
      'روش محاسبه',
      'w.nb.method',
      CHARGE_METHODS
    )}
    <div class="grid2">${sel('روز صدور', 'w.nb.issueDay', DAY_OPTIONS)}${sel(
      'سررسید',
      'w.nb.dueDay',
      DAY_OPTIONS
    )}</div>
    ${sel('واحد خالی', 'w.nb.vacancy', VACANCY_RULES, { up: true })}</div>
    <button class="btn primary block" data-a="wiz2">ساخت ساختمان</button>
    <p class="note">ساخت = شیت جدید «حسابداری · ${esc(
      v.name
    )}» با تب‌ها، دسته‌های ساختمان، حساب‌های صندوق و این تنظیمات. ۲ تا ۵ ثانیه، با نوار پیشرفت.</p>`
  }
}
ACT.wiz1 = () => {
  if (!String(UI.w.nb.name || '').trim()) return toast('نام ساختمان را وارد کنید'), false
  go('#/p/new/2')
  return false
}
