/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — sheets (modal panels) */
'use strict'
const DEBT_MODES = [
  { value: 'keep', label: 'بدهی برای ساکن قبلی بماند' },
  { value: 'to-owner', label: 'به مالک منتقل شود' },
  { value: 'forgive', label: 'بخشوده شود (بخشودگی)' }
]
const REC_OPTS = [
  { value: '', label: 'بدون تکرار' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' }
]
const closeBtn = '<button class="btn" data-a="sheetclose">بستن</button>'
const personOptions = (b, extra = []) => [
  ...extra,
  ...b.people.filter(p => p.kind === 'resident').map(p => ({ value: p.id, label: p.name })),
  { value: '__new', label: '+ افزودن فرد جدید' }
]
const accOptions = b =>
  b.accounts.map(a => ({
    value: a.id,
    label: a.name + (a.card ? ' · …' + lastDigits(a.card) : '')
  }))
const newPersonFields = (pre, d) =>
  d[pre + 'Id'] === '__new' || d[pre] === '__new'
    ? `<div class="card" style="margin-bottom:10px">${txt('نام', 'd.' + pre + 'Name')}${txt(
        'تلفن',
        'd.' + pre + 'Phone',
        { num: 1 }
      )}${txt('شمارهٔ کارت (برای تشخیص پیامک)', 'd.' + pre + 'Card', { num: 1 })}</div>`
    : ''

SHEETS.about = () => ({
  title: 'درباره و راهنما · مدیر ساختمان',
  body: `<div class="card"><b>فضای کاری جدا برای هر ساختمان</b><p class="sub">هر ساختمان یک شیت جدا در درایو شماست. صندوق، واحدها، ساکنان، شارژ و هزینه‌ها از حساب شخصی کاملاً جدا می‌مانند و با اشتراک‌گذاری همان شیت، هیئت مدیره می‌تواند ببیند و ویرایش کند.</p></div>
  <div class="card"><b>دو پل با حساب شخصی</b><p class="sub">۱) هزینهٔ «جیب مدیر» با تیک اختیاری، طلب شخصی می‌سازد. ۲) پرداخت شارژ واحد خودتان با تیک اختیاری، هزینهٔ شخصی ثبت می‌کند. چیز دیگری از ساختمان به حساب شخصی نمی‌رود.</p></div>`,
  foot: closeBtn
})
SHEETS.creating = s => ({
  title: 'در حال ساخت ساختمان…',
  body: `<div class="progress"><i style="width:${s.p.pct}%"></i></div><p class="sub">${
    s.p.pct < 40
      ? 'ساخت شیت در درایو…'
      : s.p.pct < 70
      ? 'ساخت تب‌ها: ساختمان، واحدها، ساکنان…'
      : s.p.pct < 100
      ? 'نوشتن دسته‌ها و حساب‌های صندوق…'
      : 'آماده شد'
  }</p>`
})
SHEETS.connect = s => {
  const d = s.d
  return {
    title: 'اتصال به شیت موجود',
    body: `<p class="sub">شیت‌هایی که با «حسابداری · ساختمان …» در درایو شما یا اشتراک‌شده پیدا شد:</p>
    <div class="card flat"><button class="row" data-a="doconnect" data-pick="1"><span class="badge">${ico(
      'building'
    )}</span><span class="t">حسابداری · ساختمان گلسار<small>اشتراک‌شده توسط مدیر قبلی</small></span>${ico(
      'left'
    )}</button></div>
    ${txt('یا لینک شیت را بچسبانید', 'd.link', { ph: 'https://docs.google.com/spreadsheets/d/…' })}
    ${d.err ? `<p class="neg">${d.err}</p>` : ''}`,
    foot: `${closeBtn}<button class="btn primary" data-a="doconnect">اتصال با لینک</button>`
  }
}
ACT.doconnect = d => {
  const s = UI.sheet.d
  if (!d.pick) {
    if (!String(s.link || '').trim()) return (s.err = 'لینک را وارد کنید'), true
    if (!/docs\.google\.com/.test(s.link)) return (s.err = 'این شیت ساختمان نیست'), true
  }
  const b = newBuilding('c' + Date.now(), 'ساختمان گلسار', { opening: 9000000 })
  b.myRole = 'board'
  b.members = [
    { name: 'مدیر قبلی', roleKey: 'manager' },
    { name: 'امید سهیل‌نیا', roleKey: 'board', me: true }
  ]
  for (let i = 1; i <= 6; i++) {
    const p = addPerson(b, 'ساکن ' + fa(i))
    const u = addUnit(b, { no: i, floor: Math.ceil(i / 2), ownerId: p.id, area: 90 })
    b.stays.push({
      id: uid('s'),
      unitId: u.id,
      personId: p.id,
      role: 'owner',
      from: '1404-01-01',
      to: null
    })
  }
  issueCharges(b, '1405-07', '1405-07-10', '')
  b.units
    .slice(0, 4)
    .forEach(u => payUnit(b, u.id, 1200000, b.accounts[0].id, { date: '1405-07-05' }))
  b.activity = []
  logAct(b, 'متصل شد')
  b.quickDone = true
  S.buildings.push(b)
  UI.sheet = null
  toast('«' + b.name + '» متصل شد')
}
SHEETS.unitForm = (s, b) => {
  const d = s.d
  const edit = !!s.p.unitId
  const prefill = unitCharge(b, {
    ...d,
    id: 'tmp',
    area: Number(d.area),
    people: Number(d.people),
    charge: 0
  })
  return {
    title: edit ? 'ویرایش واحد ' + fa(d.no) : 'واحد جدید',
    full: true,
    body: `<div class="grid2">${txt('شماره', 'd.no', { num: 1 })}${txt('طبقه', 'd.floor', {
      num: 1
    })}</div>
    <div class="grid2">${txt('متراژ', 'd.area', { num: 1 })}${txt('نفرات', 'd.people', {
      num: 1
    })}</div>
    <div class="grid2">${txt('پارکینگ', 'd.parking', { num: 1 })}${txt('انباری', 'd.storage', {
      num: 1
    })}</div>
    ${amt('شارژ ماهانه این واحد (تومان)', 'd.charge', {
      hint: 'پیش‌فرض ساختمان پر شده؛ فقط برای واحد خاص تغییر بده'
    })}
    ${sel('مالک', 'd.ownerId', personOptions(b), { ph: 'انتخاب مالک' })}${newPersonFields('o', {
      o: d.ownerId
    })}
    ${sel('ساکن فعلی', 'd.occId', [{ value: '', label: 'خالی (بدون ساکن)' }, ...personOptions(b)], {
      ph: 'انتخاب ساکن'
    })}${newPersonFields('c', { c: d.occId })}
    ${d.occId ? sel('نقش ساکن', 'd.occRole', RESIDENT_ROLES) : ''}`,
    foot: `${closeBtn}<button class="btn primary" data-a="saveunit">ذخیره</button>`
  }
}
ACT.saveunit = () => {
  const b = curB()
  const d = UI.sheet.d
  const exists = b.units.find(u => u.no === Number(d.no) && u.id !== UI.sheet.p.unitId)
  if (exists) return toast('شمارهٔ ' + fa(d.no) + ' قبلاً وجود دارد'), false
  const mkp = (id, pre) => {
    if (id === '__new') {
      if (!(d[pre + 'Name'] || '').trim()) return null
      return addPerson(b, d[pre + 'Name'].trim(), 'resident', {
        phone: d[pre + 'Phone'],
        card: d[pre + 'Card']
      }).id
    }
    return id
  }
  const owner = mkp(d.ownerId, 'o')
  if (!owner) return toast('مالک را انتخاب کنید'), false
  const occ = d.occId === '__new' ? mkp('__new', 'c') : d.occId
  let u = unitById(b, UI.sheet.p.unitId)
  const vals = {
    no: Number(d.no),
    floor: Number(d.floor),
    area: Number(d.area),
    people: Number(d.people),
    parking: Number(d.parking),
    storage: Number(d.storage),
    charge: d.auto && Number(d.charge) === Number(d.base0) ? 0 : Number(d.charge),
    ownerId: owner
  }
  if (u) Object.assign(u, vals)
  else u = addUnit(b, vals)
  const cur = occupantStay(b, u.id)
  if ((cur ? cur.personId : '') !== (occ || '')) {
    if (cur) cur.to = TODAY
    if (occ)
      b.stays.push({
        id: uid('s'),
        unitId: u.id,
        personId: occ,
        role: d.occRole || 'owner',
        from: TODAY,
        to: null
      })
  }
  logAct(b, 'واحد ' + fa(u.no) + ' ذخیره شد')
  UI.sheet = null
  toast('واحد ' + fa(u.no) + ' ذخیره شد')
}
SHEETS.issue = (s, b) => {
  const d = s.d
  const months = [
    ...new Set([
      ...missingIssueMonths(b),
      latestMonth(b) ? nextMonth(latestMonth(b)) : '1405-08',
      '1405-08'
    ])
  ].sort()
  const plan = planIssue(b, d.month)
  return {
    title: 'صدور شارژ',
    full: true,
    body: `${sel(
      'ماه',
      'd.month',
      months.map(m => ({ value: m, label: monthLabel(m) })),
      { id: 'im' }
    )}
    <div class="grid2">${sel('سررسید', 'd.dueDay', DAY_OPTIONS, { id: 'idd' })}${txt(
      'یادداشت (اختیاری)',
      'd.note'
    )}</div>
    <div class="card flat"><table class="tbl" style="padding:0 8px"><tr><th>واحد</th><th>بدهکار</th><th>مبنا</th><th>مبلغ</th></tr>${plan.rows
      .map(
        r =>
          `<tr style="${r.already ? 'opacity:.5' : ''}"><td>${fa(r.unit.no)}</td><td>${esc(
            r.debtor.person.name
          )}${r.debtor.role === 'owner' && !occupantStay(b, r.unit.id) ? ' (مالک)' : ''}</td><td>${
            r.already ? 'قبلاً صادر شده' : esc(r.basis)
          }</td><td>${r.zero ? 'معاف' : money(r.amount)}</td></tr>`
      )
      .join('')}</table></div>
    ${
      plan.skipped.length
        ? `<p class="note neg">بدون ساکن و مالک (صادر نمی‌شود): ${plan.skipped
            .map(u => fa(u.no))
            .join('، ')}</p>`
        : ''
    }
    <div class="split-sum"><span>جمع</span><span>${money(plan.total)} · ${fa(
      plan.count
    )} واحد</span></div>
    ${
      b.units.some(u => u.credit > 0)
        ? '<p class="note pos">اعتبار واحدها خودکار از شارژ جدید کسر می‌شود.</p>'
        : ''
    }`,
    foot: `${closeBtn}<button class="btn primary" data-a="doissue" ${
      plan.count ? '' : 'disabled'
    }>${plan.count ? 'صدور شارژ ' + monthName(d.month) : 'همه قبلاً صادر شده'}</button>`
  }
}
SHEETS.monthUnits = (s, b) => {
  const k = s.p.m
  const ms = monthSummary(b, k)
  return {
    title: 'شارژ ' + monthLabel(k),
    body: `<div class="card flat">${ms.rows
      .map(r => {
        const st =
          openOf(r) <= 0 ? ['good', 'پرداخت شد'] : paidOf(r) > 0 ? ['warn', 'ناقص'] : ['bad', 'باز']
        const u = unitById(b, r.unitId)
        return `<div class="row"><span class="badge ${openOf(r) > 0 ? 'debt' : ''}">${fa(
          u.no
        )}</span><span class="t">${esc(personById(b, r.debtorId).name)}<small>${money(r.amount)}${
          paidOf(r) ? ' · پرداخت ' + money(paidOf(r)) : ''
        }</small></span><span class="pill ${st[0]}">${st[1]}</span>${
          openOf(r) > 0
            ? `<button class="btn sm" data-a="payopen" data-u="${u.id}">ثبت پرداخت</button>`
            : ''
        }</div>`
      })
      .join('')}</div>`,
    foot: closeBtn
  }
}
