/* eslint-disable -- prototype scripts share globals, not part of the app source */
ACT.exportcsv = () => {
  const b = curB()
  const rows = [['واحد', 'نام', 'ماه‌های بدهکار', 'مبلغ']]
  debtorUnits(b).forEach(u =>
    rows.push([
      u.no,
      (chargeDebtor(b, u) || { person: { name: '' } }).person.name,
      unitBalance(b, u.id).months.length,
      unitBalance(b, u.id).open
    ])
  )
  rows.push([], ['موجودی صندوق', '', '', sumAcc(b)])
  const csv = '﻿' + rows.map(r => r.join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'گزارش-مجمع-۱۴۰۵.csv'
  a.click()
  toast('گزارش مجمع ذخیره شد')
}

ACT.exportpdf = () => toast('PDF با downloadTablePdf موجود اپ ساخته می‌شود (در پروتوتایپ فقط CSV)')

/* ================= settings ================= */
BPAGES.settings = (R, b) => {
  const manage = `<button class="btn block" data-a="sheet" data-n="lists">مدیریت فهرست‌ها (نوع هزینه، پرداخت‌کننده)</button>`
  return {
    title: 'تنظیمات ساختمان',
    html: `<div class="sec"><span>مشخصات</span></div><div class="card">${txt('نام', 'b.name')}${txt(
      'نشانی',
      'b.address'
    )}${txt('تعداد طبقه', 'b.floors', { num: 1 })}</div>
    <div class="sec"><span>شارژ</span></div><div class="card">${txt(
      'شارژ پیش‌فرض (تومان)',
      'b.profile.defaultCharge',
      { amount: 1, num: 1 }
    )}${sel('روش محاسبه', 'b.profile.method', CHARGE_METHODS)}
    <div class="grid2">${sel('روز صدور', 'b.profile.issueDay', DAY_OPTIONS, { id: 'iday' })}${sel(
      'سررسید',
      'b.profile.dueDay',
      DAY_OPTIONS,
      { id: 'dday' }
    )}</div>${sel('واحد خالی', 'b.profile.vacancy', VACANCY_RULES, { id: 'vac', up: true })}</div>
    <p class="note">با تغییر روش محاسبه، شارژ واحدها در صدور بعدی با قاعدهٔ جدید حساب می‌شود؛ شارژهای صادرشده تغییر نمی‌کنند.</p>
    <div class="sec"><span>فهرست‌ها</span></div>${manage}
    <div class="sec"><span>مسیریابی پیامک</span></div><div class="card flat">${b.accounts
      .map(
        a =>
          `<div class="row"><span class="t">${esc(a.name)}<small>${
            a.card
              ? 'پیامک کارت ' +
                esc(a.card.slice(0, 4) + '…' + a.card.slice(-4)) +
                ' به این ساختمان می‌آید'
              : 'نقدی · بدون پیامک'
          }</small></span></div>`
      )
      .join('')}</div>
    <div class="sec"><span>اعضا (اشتراک درایو)</span></div><div class="card flat">${b.members
      .map(
        (m, i) =>
          `<div style="padding:10px 12px;border-bottom:1px solid var(--color-border)"><div style="display:flex;gap:8px;align-items:center">${avatarOf(
            m.name
          )}<b>${esc(m.name)}${m.me ? ' (شما)' : ''}</b></div>${
            m.me
              ? '<span class="sub">مدیر · قابل تغییر نیست</span>'
              : sel('نقش در این ساختمان', 'b.members.' + i + '.roleKey', BUILDING_ROLES, {
                  id: 'mr' + i
                })
          }</div>`
      )
      .join('')}</div>
    <div class="sec"><span>فعالیت‌ها</span></div><div class="card flat">${
      b.activity
        .slice(0, 5)
        .map(
          a =>
            `<div class="row"><span class="t">${esc(a.text)}<small>${dateFa(
              a.date
            )}</small></span></div>`
        )
        .join('') || '<div class="row muted">—</div>'
    }</div>
    <button class="btn block" data-a="go" data-to="#/p/dashboard">${ico(
      'exit',
      'sm'
    )} برگشت به حساب شخصی</button>
    <button class="btn danger block" data-a="sheet" data-n="removeB">حذف اتصال این ساختمان از اپ</button>`
  }
}
ACT.removeb = () => {
  const b = curB()
  S.buildings = S.buildings.filter(x => x.id !== b.id)
  UI.sheet = null
  go('#/p/buildings')
  toast('اتصال حذف شد (شیت در درایو می‌ماند)')
  return false
}
ACT.addlist = d => {
  const b = curB()
  const nm = (UI.sheet.d.newName || '').trim()
  if (!nm) return toast('نام را وارد کنید'), false
  const list = b.lists[d.l]
  list.push(
    d.l === 'expenseKinds'
      ? {
          value: 'k' + Date.now(),
          label: nm,
          chargeTo: UI.sheet.d.newTo || 'resident',
          hidden: false
        }
      : { value: 'p' + Date.now(), label: nm, hidden: false }
  )
  UI.sheet.d.newName = ''
}
