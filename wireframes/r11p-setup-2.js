/* eslint-disable -- prototype scripts share globals, not part of the app source */
SHEETS.prevDebts = (s, b) => {
  const d = s.d
  if (!d.debts) d.debts = {}
  return {
    title: 'بدهی‌های قبلی واحدها',
    full: true,
    body: `<p class="sub">اگر واحدی از قبل از شروع کار با اپ بدهی دارد، مبلغ را بنویس. برای بقیه خالی بگذار.</p><div class="card"><div class="grid2">${b.units
      .map(u =>
        txt(
          'واحد ' +
            fa(u.no) +
            ' · ' +
            esc((chargeDebtor(b, u) || { person: { name: '—' } }).person.name),
          'd.debts.' + u.id,
          { amount: 1, num: 1 }
        )
      )
      .join('')}</div></div>`,
    foot: `<button class="btn" data-a="setupskip" data-k="debts">رد کردن</button><button class="btn primary" data-a="saveprev">ثبت و ادامه</button>`
  }
}
ACT.saveprev = () => {
  const b = curB()
  const d = UI.sheet.d
  let n = 0
  b.units.forEach(u => {
    const v = Number((d.debts || {})[u.id]) || 0
    const de = chargeDebtor(b, u)
    if (v > 0 && de) {
      b.rec.push({
        id: uid('r'),
        unitId: u.id,
        debtorId: de.person.id,
        title: 'بدهی قبلی · واحد ' + fa(u.no),
        ref: 'opening:' + u.id,
        amount: v,
        due: TODAY,
        month: prevMonth(TODAY.slice(0, 7)),
        cat: 'شارژ ساختمان',
        sub: 'قبلی',
        paid: []
      })
      n++
    }
  })
  b.setup.debts = true
  logAct(b, 'بدهی قبلی ' + fa(n) + ' واحد ثبت شد')
  return goNextStep(b)
}
SHEETS.invite = s => ({
  title: 'دعوت عضو',
  body: `<p class="sub">نقش تعیین می‌کند عضو چه کارهایی بتواند بکند. شیت با ایمیل او در درایو به‌اشتراک گذاشته می‌شود (مدیر و حسابدار: ویرایش، عضو هیئت مدیره: فقط مشاهده).</p>${txt(
    'نام و ایمیل',
    'd.name',
    { ph: 'خانم جلالی · jalali@example.com' }
  )}${sel(
    'نقش',
    'd.role',
    BUILDING_ROLES.filter(r => r.value !== 'manager'),
    { id: 'ir', hint: 'دسترسی‌ها در تنظیمات ← نقش‌ها و دسترسی‌ها' }
  )}`,
  foot: `<button class="btn" data-a="setupskip" data-k="invite">رد کردن</button><button class="btn primary" data-a="saveinvite">دعوت و کپی متن</button>`
})
ACT.saveinvite = () => {
  const b = curB()
  const d = UI.sheet.d
  if (!String(d.name || '').trim()) return toast('نام یا ایمیل را وارد کنید'), false
  const role = d.role || 'accountant'
  b.members.push({ name: d.name.trim(), roleKey: role })
  b.setup.invite = true
  logAct(b, 'دعوت ' + d.name.trim())
  const text =
    'سلام، شیت «حسابداری · ' +
    b.name +
    '» را با شما به اشتراک گذاشتم. نقش شما: ' +
    (BUILDING_ROLES.find(r => r.value === role) || {}).label +
    '. در اپ از «مدیر ساختمان ← اتصال به شیت موجود» وصلش کنید.'
  try {
    navigator.clipboard.writeText(text)
  } catch (e) {}
  UI.sheet = null
  go('#/b/' + b.id + '/dashboard')
  setTimeout(() => openSheet('textShare', {}, { text, title: 'متن دعوت' }), 80)
  return false
}

/* ---------- first issue → continue the journey; connect → enter the building ---------- */
const origDoIssue = ACT.doissue
ACT.doissue = () => {
  const b = curB()
  const first = !chargeMonths(b).length
  const r = origDoIssue()
  if (first && nextStep(b)) {
    setTimeout(() => goNextStep(b), 0)
  }
  return r
}
const origConnect = ACT.doconnect
ACT.doconnect = d => {
  const n = S.buildings.length
  const r = origConnect(d)
  if (S.buildings.length > n) {
    go('#/b/' + S.buildings[S.buildings.length - 1].id + '/dashboard')
    return false
  }
  return r
}
