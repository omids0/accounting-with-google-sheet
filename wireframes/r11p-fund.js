/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — fund page: accounts, reconcile with the bank, add / edit account */
'use strict'
BPAGES.fund = (R, b) => {
  const months = allMonths(b).slice(0, 6).reverse()
  const mx = Math.max(1, ...months.flatMap(m => [flowIn(b, m), flowOut(b, m)]))
  const lm = months[months.length - 1]
  const recs = b.recs.slice(0, 12)
  const sign = r =>
    r.type === 'income'
      ? '+'
      : r.type === 'expense'
      ? '‎−'
      : r.type === 'correction'
      ? r.amount >= 0
        ? '+'
        : '‎−'
      : '⇄'
  const cls = r =>
    r.type === 'income' || (r.type === 'correction' && r.amount >= 0)
      ? 'pos'
      : r.type === 'expense' || (r.type === 'correction' && r.amount < 0)
      ? 'neg'
      : 'muted'
  return {
    title: 'صندوق',
    html: `<div class="hero"><small>موجودی صندوق (مجموع حساب‌ها)</small><div class="big num">${money(
      sumAcc(b)
    )}</div><div class="delta">${
      lm ? 'وصول − هزینه در ' + monthName(lm) + ': ' + money(flowIn(b, lm) - flowOut(b, lm)) : ''
    }</div></div>
    <div class="card"><b>روند ۶ ماه</b><div class="cols">${months
      .map(
        m =>
          `<div class="c"><div class="pair"><i class="g" style="height:${
            (flowIn(b, m) / mx) * 100
          }%"></i><i style="height:${(flowOut(b, m) / mx) * 100}%"></i></div>${monthName(m)}</div>`
      )
      .join(
        ''
      )}</div><span class="sub"><span class="pill good">وصول</span> <span class="pill">هزینه</span> — انتقال‌ها و اصلاح موجودی در این نمودار نیست</span></div>
    <div class="sec"><span>حساب‌ها</span><button data-a="sheet" data-n="accountForm">+ حساب جدید</button></div><div class="card flat">${b.accounts
      .map(
        a =>
          `<button class="row" data-a="sheet" data-n="account" data-u="${
            a.id
          }"><span class="badge">${ico('bank')}</span><span class="t">${esc(a.name)}<small>${esc(
            a.card || 'نقدی'
          )}</small></span><span class="amt">${money(a.balance)}</span>${ico('left')}</button>`
      )
      .join('')}</div>
    <p class="note">لمس حساب: تطبیق موجودی با بانک، ویرایش نام و کارت، رکوردهای همان حساب.</p>
    <div class="sec"><span>آخرین رکوردها</span></div><div class="card flat">${recs
      .map(
        r =>
          `<div class="row"><span class="t">${esc(r.title)}<small>${dateFa(r.date)} · ${esc(
            r.cat
          )}${r.type === 'transfer' ? ' · انتقال' : ''}${
            r.type === 'correction' ? ' · اصلاح' : ''
          }</small></span><span class="amt ${cls(r)}">${sign(r)}${money(
            Math.abs(r.amount)
          )}</span></div>`
      )
      .join('')}</div>`,
    fab: [{ a: 'sheet', data: 'data-n="incomeForm"', label: '+ دریافت متفرقه' }]
  }
}
const origSheetFund = ACT.sheet
ACT.sheet = (d, el) => {
  const b = curB()
  if (d.n === 'reconcile') {
    const a = accById(b, d.u)
    openSheet('reconcile', { real: a.balance }, { unitId: d.u })
    return false
  }
  if (d.n === 'accountForm') {
    const a = d.u ? accById(b, d.u) : null
    openSheet(
      'accountForm',
      a ? { name: a.name, card: a.card, bal: 0 } : { name: '', card: '', bal: 0 },
      { unitId: d.u }
    )
    return false
  }
  if (d.n === 'account') {
    openSheet('account', {}, { unitId: d.u })
    return false
  }
  return origSheetFund(d, el)
}
SHEETS.account = (s, b) => {
  const a = accById(b, s.p.unitId)
  const recs = b.recs.filter(r => r.acc === a.id).slice(0, 5)
  return {
    title: a.name,
    body: `<div class="card"><span class="sub">موجودی فعلی در اپ</span><b style="font-size:22px">${money(
      a.balance
    )}</b><span class="sub">${esc(a.card || 'حساب نقدی')}</span></div>
    <div class="btns" style="margin:10px 0"><button class="btn primary" data-a="sheet" data-n="reconcile" data-u="${
      a.id
    }">تطبیق موجودی با بانک</button><button class="btn" data-a="sheet" data-n="accountForm" data-u="${
      a.id
    }">ویرایش حساب</button></div>
    <div class="sec"><span>آخرین رکوردهای این حساب</span></div><div class="card flat">${
      recs
        .map(
          r =>
            `<div class="row"><span class="t">${esc(r.title)}<small>${dateFa(
              r.date
            )}</small></span><span class="amt ${
              r.type === 'income' || (r.type === 'correction' && r.amount >= 0) ? 'pos' : 'neg'
            }">${money(Math.abs(r.amount))}</span></div>`
        )
        .join('') || '<div class="row muted">رکوردی نیست</div>'
    }</div>`,
    foot: closeBtn
  }
}
SHEETS.reconcile = (s, b) => {
  const a = accById(b, s.p.unitId)
  const diff = Number(s.d.real) - a.balance
  return {
    title: 'تطبیق موجودی · ' + a.name,
    body: `<p class="sub">موجودی واقعی حساب را از اپ بانک یا دفتر نقدی ببین و اینجا وارد کن. اپ اختلاف را با یک رکورد اصلاحی ثبت می‌کند؛ هیچ رکورد قبلی تغییر نمی‌کند.</p>
    <div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span>موجودی در اپ</span><b>${money(
      a.balance
    )}</b></div></div>
    ${amt('موجودی واقعی حساب (تومان)', 'd.real')}
    <div class="guide ${diff === 0 ? 'ok' : ''}"><b>${
      diff === 0
        ? 'موجودی با بانک یکی است ✓'
        : 'اختلاف: ' + (diff > 0 ? '+' : '‎−') + money(Math.abs(diff))
    }</b>${
      diff === 0
        ? ''
        : 'یک رکورد «اصلاح موجودی» ثبت می‌شود. این رکورد در گزارش هزینه‌ها و «وصول − هزینه» نمی‌آید و در فهرست رکوردها می‌ماند.'
    }</div>`,
    foot: `${closeBtn}<button class="btn primary" data-a="savereconcile" ${
      diff === 0 ? 'disabled' : ''
    }>ثبت اصلاح موجودی</button>`
  }
}
ACT.savereconcile = () => {
  const b = curB()
  const a = accById(b, UI.sheet.p.unitId)
  const diff = Number(UI.sheet.d.real) - a.balance
  if (!diff) return false
  addRec(b, {
    type: 'correction',
    title: 'اصلاح موجودی · ' + a.name,
    amount: diff,
    cat: 'اصلاح موجودی',
    sub: 'تطبیق با بانک',
    acc: a.id
  })
  logAct(b, 'موجودی ' + a.name + ' با بانک تطبیق داده شد')
  UI.sheet = null
  toast('موجودی ' + a.name + ' شد ' + money(a.balance))
}
SHEETS.accountForm = (s, b) => {
  const edit = !!s.p.unitId
  return {
    title: edit ? 'ویرایش حساب' : 'حساب جدید',
    body: `${txt('نام حساب', 'd.name')}${txt('شمارهٔ کارت (برای مسیریابی پیامک)', 'd.card', {
      tel: 1,
      hint: 'پیامک‌های این کارت به همین ساختمان می‌آید'
    })}${
      edit
        ? '<p class="note">برای تغییر موجودی از «تطبیق موجودی با بانک» استفاده کن تا تاریخچه حفظ شود.</p>'
        : amt('موجودی فعلی (تومان)', 'd.bal')
    }`,
    foot: `${closeBtn}<button class="btn primary" data-a="saveaccount">ذخیره</button>`
  }
}
ACT.saveaccount = () => {
  const b = curB()
  const d = UI.sheet.d
  if (!String(d.name || '').trim()) return toast('نام حساب را وارد کنید'), false
  if (UI.sheet.p.unitId) {
    const a = accById(b, UI.sheet.p.unitId)
    a.name = d.name.trim()
    a.card = d.card
  } else {
    b.accounts.push({
      id: uid('a'),
      name: d.name.trim(),
      card: d.card,
      balance: Number(d.bal) || 0
    })
    logAct(b, 'حساب جدید: ' + d.name.trim())
  }
  UI.sheet = null
  toast('حساب ذخیره شد')
}
