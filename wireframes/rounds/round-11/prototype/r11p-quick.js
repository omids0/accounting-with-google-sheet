/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — quick units builder (3 steps), unit-by-unit completion, auto monthly issue */
'use strict'

/* ---------- quick units builder: 1) totals + reference area  2) unit ranges per floor  3) area per unit ---------- */
function evenEnds(from, total, floors) {
  const left = Math.max(0, total - from)
  const base = Math.floor(left / floors)
  const extra = left % floors
  const ends = []
  let acc = from
  for (let i = 0; i < floors; i++) {
    acc += base + (i < extra ? 1 : 0)
    ends.push(acc)
  }
  return ends
}
AFTER.quickReflow = (v, bind) => {
  const d = UI.sheet.d
  const i = Number(bind.split('.').pop())
  const total = Number(d.total)
  const floors = Number(d.floors)
  d.ends[i] = Number(v)
  if (i === floors - 1) d.ends[i] = total
  else {
    const rest = evenEnds(d.ends[i], total, floors - 1 - i)
    rest.forEach((e, k) => (d.ends[i + 1 + k] = e))
  }
}
const qSteps = n =>
  `<div class="steps" style="margin-bottom:10px">${[1, 2, 3]
    .map(i => `<i class="${i <= n ? 'on' : ''}"></i>`)
    .join('')}</div>`
SHEETS.quick = s => {
  const d = s.d
  const total = Number(d.total)
  const floors = Number(d.floors)
  if (d.phase === 3) {
    const byFloor = d.ends
      .map((end, i) => {
        const from = i === 0 ? 1 : d.ends[i - 1] + 1
        const nos = []
        for (let n = from; n <= end; n++) nos.push(n)
        if (!nos.length) return ''
        return `<div class="sec"><span>طبقه ${fa(
          i + 1
        )}</span></div><div class="card"><div class="grid2">${nos
          .map(n => txt('واحد ' + fa(n) + ' · متراژ', 'd.areas.' + n, { num: 1 }))
          .join('')}</div></div>`
      })
      .join('')
    return {
      title: 'ساخت سریع واحدها · ۳ از ۳',
      full: true,
      body: `${qSteps(3)}<p class="sub">همه با متراژ مرجع (${fa(
        d.area
      )} متر) پر شده‌اند؛ فقط واحدهای متفاوت را ویرایش کن.</p><button class="btn sm" data-a="quickresetareas">برگرداندن همه به متراژ مرجع</button>${byFloor}`,
      foot: `<button class="btn" data-a="quickback">قبلی</button><button class="btn primary" data-a="quickbuild">ساخت ${fa(
        total
      )} واحد</button>`
    }
  }
  if (d.phase === 2) {
    const rows = d.ends
      .map((end, i) => {
        const from = i === 0 ? 1 : d.ends[i - 1] + 1
        const n = Math.max(0, end - from + 1)
        const last = i === floors - 1
        const opts = []
        for (let v = Math.max(from - 1, 0); v <= total; v++)
          opts.push({ value: String(v), label: v < from ? 'بدون واحد' : fa(v) })
        return `<div class="card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center"><b>طبقه ${fa(
          i + 1
        )}</b><span class="pill ${n ? '' : 'warn'}">${
          n ? fa(n) + ' واحد' : 'بدون واحد'
        }</span></div>
        <span class="sub">${n ? 'واحد ' + fa(from) + ' تا ' + fa(end) : 'خالی'}</span>
        ${
          last
            ? ''
            : sel('این طبقه تا واحد…', 'd.ends.' + i, opts, {
                id: 'qe' + i,
                after: 'quickReflow',
                up: i > 3
              })
        }</div>`
      })
      .join('')
    return {
      title: 'ساخت سریع واحدها · ۲ از ۳',
      full: true,
      body: `${qSteps(2)}<p class="sub">${fa(total)} واحد در ${fa(
        floors
      )} طبقه. هر طبقه را به ترتیب تنظیم کن؛ باقی‌ماندهٔ واحدها خودکار بین طبقه‌های بعدی پخش می‌شود.</p>${rows}`,
      foot: `<button class="btn" data-a="quickback">قبلی</button><button class="btn primary" data-a="quickareas">بعدی: متراژ واحدها</button>`
    }
  }
  return {
    title: 'ساخت سریع واحدها · ۱ از ۳',
    body: `${qSteps(
      1
    )}<p class="sub">اول تعداد کل واحدها و طبقه‌ها را بگو. متراژ مرجع در قدم آخر برای همهٔ واحدها پر می‌شود و واحدهای خاص را جدا ویرایش می‌کنی.</p>
    ${txt('تعداد کل واحدها', 'd.total', { num: 1 })}${txt('تعداد کل طبقه‌ها', 'd.floors', {
      num: 1
    })}${txt('متراژ مرجع (واحد معمولی)', 'd.area', { num: 1 })}`,
    foot: `<button class="btn" data-a="sheetclose">بعداً، دستی</button><button class="btn primary" data-a="quicknext">بعدی</button>`
  }
}
ACT.quicknext = () => {
  const d = UI.sheet.d
  const total = Number(d.total)
  const floors = Number(d.floors)
  if (!(total >= 1 && total <= 200)) return toast('تعداد واحدها را بین ۱ تا ۲۰۰ وارد کنید'), false
  if (!(floors >= 1 && floors <= 60)) return toast('تعداد طبقه‌ها را بین ۱ تا ۶۰ وارد کنید'), false
  if (!(Number(d.area) > 0)) return toast('متراژ مرجع را وارد کنید'), false
  d.ends = evenEnds(0, total, floors)
  d.phase = 2
}
ACT.quickareas = () => {
  const d = UI.sheet.d
  d.areas = d.areas || {}
  for (let n = 1; n <= Number(d.total); n++)
    if (d.areas[n] === undefined) d.areas[n] = Number(d.area)
  d.phase = 3
}
ACT.quickresetareas = () => {
  const d = UI.sheet.d
  for (let n = 1; n <= Number(d.total); n++) d.areas[n] = Number(d.area)
}
ACT.quickback = () => {
  UI.sheet.d.phase = Math.max(1, UI.sheet.d.phase - 1)
}
ACT.quickbuild = () => {
  const b = curB()
  const d = UI.sheet.d
  let n = 0
  d.ends.forEach((end, i) => {
    const from = i === 0 ? 1 : d.ends[i - 1] + 1
    for (let no = from; no <= end; no++) {
      if (unitByNo(b, no)) continue
      const owner = addPerson(b, 'مالک واحد ' + fa(no))
      owner.placeholder = true
      const u = addUnit(b, {
        no,
        floor: i + 1,
        area: Number((d.areas && d.areas[no]) || d.area),
        people: 3,
        ownerId: owner.id
      })
      b.stays.push({
        id: uid('s'),
        unitId: u.id,
        personId: owner.id,
        role: 'owner',
        from: '1405-01-01',
        to: null
      })
      n++
    }
  })
  b.floors = Number(d.floors)
  b.quickDone = true
  logAct(b, fa(n) + ' واحد در ' + fa(d.floors) + ' طبقه ساخته شد')
  ACT.fillopen()
  toast(fa(n) + ' واحد ساخته شد · حالا مالک و ساکنان را کامل کن')
  return false
}

/* ---------- complete unit details one by one: owner, occupancy, tenant, people, extras ---------- */
const OCCUPANCY = [
  { value: 'owner', label: 'مالک خودش ساکن است' },
  { value: 'tenant', label: 'مستأجر دارد' },
  { value: 'vacant', label: 'خالی است' }
]
const isPlaceholder = (b, u) => !!(personById(b, u.ownerId) || {}).placeholder
const incompleteUnits = b => b.units.filter(u => isPlaceholder(b, u))
function fillLoad(b, d, i) {
  const u = b.units[i]
  const ow = personById(b, u.ownerId)
  const st = occupantStay(b, u.id)
  const tn = st && st.role === 'tenant' ? personById(b, st.personId) : null
  d.i = i
  d.oName = ow && !ow.placeholder ? ow.name : ''
  d.oPhone = (ow && ow.phone) || ''
  d.oCard = (ow && ow.card) || ''
  d.status = !st ? 'vacant' : st.role === 'tenant' ? 'tenant' : 'owner'
  d.tName = tn ? tn.name : ''
  d.tPhone = tn ? tn.phone : ''
  d.people = u.people
  d.parking = u.parking
  d.storage = u.storage
  d.area = u.area
  d.charge = u.charge || baseChargeFor(b, u.area, u.people)
  d.base0 = d.charge
  d.auto = !u.charge
}
ACT.fillopen = () => {
  const b = curB()
  const first = b.units.findIndex(u => isPlaceholder(b, u))
  const d = {}
  fillLoad(b, d, first < 0 ? 0 : first)
  openSheet('fillUnits', d)
  return false
}
SHEETS.fillUnits = (s, b) => {
  const d = s.d
  const u = b.units[d.i]
  if (!u)
    return { title: 'تکمیل واحدها', body: '<div class="empty">واحدی نیست</div>', foot: closeBtn }
  const done = b.units.length - incompleteUnits(b).length
  const last = d.i === b.units.length - 1
  return {
    title: 'تکمیل مشخصات واحد ' + fa(u.no),
    full: true,
    body: `<div class="progress" style="margin:0 0 6px"><i style="width:${Math.round(
      (done / b.units.length) * 100
    )}%"></i></div><span class="sub">${fa(done)} از ${fa(
      b.units.length
    )} واحد تکمیل شده · واحد ${fa(u.no)} · طبقه ${fa(u.floor)}</span>
    <div class="sec"><span>مالک</span></div>${txt(
      'نام و نام خانوادگی مالک',
      'd.oName'
    )}<div class="grid2">${txt('تلفن', 'd.oPhone', { tel: 1 })}${txt(
      'شمارهٔ کارت (برای تشخیص پیامک)',
      'd.oCard',
      { tel: 1 }
    )}</div>
    <div class="sec"><span>سکونت</span></div>${sel('وضعیت واحد', 'd.status', OCCUPANCY, {
      id: 'fs'
    })}
    ${
      d.status === 'tenant'
        ? `<div class="card" style="margin-bottom:10px">${txt('نام مستأجر', 'd.tName')}${txt(
            'تلفن مستأجر',
            'd.tPhone',
            { tel: 1 }
          )}</div>`
        : ''
    }
    <div class="sec"><span>مشخصات</span></div><div class="grid2">${txt('متراژ', 'd.area', {
      num: 1
    })}${txt('تعداد نفرات', 'd.people', { num: 1 })}</div><div class="grid2">${txt(
      'پارکینگ',
      'd.parking',
      { num: 1 }
    )}${txt('انباری', 'd.storage', { num: 1 })}</div>
    ${amt('شارژ ماهانه این واحد (تومان)', 'd.charge', {
      hint: 'پیش‌فرض ساختمان پر شده؛ فقط برای واحد خاص تغییر بده'
    })}`,
    foot: `<button class="btn" data-a="fillprev" ${
      d.i === 0 ? 'disabled' : ''
    }>قبلی</button><button class="btn" data-a="fillskip">${
      last ? 'بستن' : 'رد کردن'
    }</button><button class="btn primary" data-a="fillsave">${
      last ? 'ذخیره و پایان' : 'ذخیره و بعدی'
    }</button>`
  }
}
ACT.fillprev = () => {
  const b = curB()
  const d = UI.sheet.d
  if (d.i > 0) fillLoad(b, d, d.i - 1)
}
