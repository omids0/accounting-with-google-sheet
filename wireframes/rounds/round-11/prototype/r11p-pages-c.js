/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — expenses, fund, debts, checks, counterparties, SMS, reports, settings */
'use strict'
const kindLabel = (b, v) => (kindOf(b, v) || {}).label || '—'
const payerLabel = (b, v) => (payerOf(b, v) || {}).label || '—'
const allMonths = b =>
  [...new Set([...b.recs.map(r => r.date.slice(0, 7)), ...chargeMonths(b)])].sort().reverse()

/* ================= expenses ================= */
BPAGES.expenses = (R, b) => {
  const months = allMonths(b)
  UI.f.m = UI.f.m || months[0] || '1405-07'
  const mk = UI.f.m
  const list = b.recs.filter(r => r.type === 'expense' && r.date.startsWith(mk))
  const tot = list.reduce((s, r) => s + r.amount, 0)
  return {
    title: 'هزینه‌ها',
    html: `${sel(
      '',
      'f.m',
      months.map(m => ({ value: m, label: monthLabel(m) })),
      { id: 'mpick' }
    )}
    <div class="stats"><div class="stat"><small>جمع هزینه ${monthName(mk)}</small><b>${money(
      tot
    )}</b></div><div class="stat"><small>تعداد</small><b>${fa(list.length)}</b></div></div>
    ${
      list.length
        ? `<div class="card flat">${list
            .map(
              r =>
                `<button class="row" data-a="expdetail" data-r="${r.id}"><span class="t">${esc(
                  r.title
                )}<small>${esc(r.cat)}${r.sub ? ' › ' + esc(r.sub) : ''} · ${kindLabel(
                  b,
                  r.kind
                )} · ${payerLabel(b, r.payer)}${r.split ? ' · تقسیم‌شده' : ''}${
                  r.attach ? ' · 📎' : ''
                }${r.recurring ? ' · 🔁' : ''}</small></span><span class="amt neg">${money(
                  r.amount
                )}</span></button>`
            )
            .join('')}</div>`
        : emptyBox('هزینه‌ای در این ماه نیست', 'با دکمهٔ شناور اولین هزینه را ثبت کن.')
    }`,
    fab: [{ a: 'sheet', data: 'data-n="expenseForm"', label: '+ هزینه' }]
  }
}
ACT.expdetail = d => {
  openSheet('expDetail', { editAmt: false, amount: 0 }, { r: d.r })
  return false
}
function expenseDraft(b) {
  return {
    title: '',
    amount: 0,
    date: TODAY,
    cat: 'تعمیرات',
    sub: 'تأسیسات',
    cp: '',
    kind: 'current',
    payer: 'fund',
    acc: S.lastAcc?.[b.id] || b.accounts[0].id,
    attach: false,
    recurring: '',
    splitOn: false,
    mode: 'equal',
    bridge: !!(S.bridgePref && S.bridgePref.pocket),
    items: [{ name: '', qty: 1, price: 0 }],
    manual: {},
    showPrev: false,
    err: ''
  }
}
AFTER.catChanged = (v, bind) => {
  const subs = BUILDING_CATS.expense[v] || []
  UI.sheet.d.sub = subs[0] || ''
}
AFTER.accPick = v => {
  const b = curB()
  S.lastAcc = S.lastAcc || {}
  S.lastAcc[b.id] = v
}
AFTER['tog:showPrev'] = () => {}
ACT.additem = () => {
  UI.sheet.d.items.push({ name: '', qty: 1, price: 0 })
}
ACT.delitem = d => {
  UI.sheet.d.items.splice(Number(d.i), 1)
  if (!UI.sheet.d.items.length) UI.sheet.d.items.push({ name: '', qty: 1, price: 0 })
}
ACT.itemsum = () => {
  const d = UI.sheet.d
  d.amount = d.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0)
}
ACT.saveexp = () => {
  const b = curB()
  const d = UI.sheet.d
  const items = d.items.filter(i => i.name || i.price)
  if (!String(d.title).trim()) return (d.err = 'عنوان هزینه را وارد کنید'), true
  if (!(Number(d.amount) > 0)) return (d.err = 'مبلغ را وارد کنید'), true
  if (d.payer === 'fund' && !d.acc) return (d.err = 'حساب صندوق را انتخاب کنید'), true
  if (d.splitOn && d.mode === 'manual') {
    const sum = b.units.filter(u => u.active).reduce((s, u) => s + (Number(d.manual[u.id]) || 0), 0)
    if (sum !== Number(d.amount))
      return (
        (d.err =
          'جمع سهم‌های دستی (' +
          money(sum) +
          ') با مبلغ هزینه (' +
          money(d.amount) +
          ') برابر نیست'),
        true
      )
  }
  S.bridgePref = Object.assign(S.bridgePref || {}, { pocket: !!d.bridge })
  const out = saveExpense(b, Object.assign({}, d, { items }))
  UI.sheet = null
  toast(
    'هزینه ثبت شد' +
      (out.shares ? ' · ' + fa(out.shares) + ' سهم برای واحدها صادر شد' : '') +
      (out.dang
        ? ' · بدهی به ' +
          out.dang.cp +
          ' ساخته شد' +
          (out.dang.bridged ? ' و طلب در حساب شخصی' : '')
        : '')
  )
}
ACT.delexp = d => {
  const b = curB()
  const r = b.recs.find(x => x.id === d.r)
  const unpaid = b.rec.filter(x => (x.ref || '').endsWith(':' + d.r) && !x.paid.length).length
  deleteExpense(b, d.r)
  UI.sheet = null
  toast('هزینه حذف شد' + (unpaid ? ' · ' + fa(unpaid) + ' سهم پرداخت‌نشده حذف شد' : ''))
}
ACT.editamt = () => {
  UI.sheet.d.editAmt = true
}
ACT.saveamt = d => {
  const b = curB()
  const v = UI.sheet.d.amount
  if (!(v > 0)) return toast('مبلغ معتبر وارد کنید'), false
  editExpenseAmount(b, d.r, v)
  UI.sheet.d.editAmt = false
  toast('مبلغ به‌روز شد · فقط سهم‌های پرداخت‌نشده بازمحاسبه شدند')
}

/* ================= fund ================= */
BPAGES.fund = (R, b) => {
  const months = allMonths(b).slice(0, 6).reverse()
  const mx = Math.max(1, ...months.flatMap(m => [flowIn(b, m), flowOut(b, m)]))
  const lm = months[months.length - 1]
  const recs = b.recs.slice(0, 12)
  return {
    title: 'صندوق',
    html: `<div class="hero"><small>موجودی صندوق (مجموع حساب‌ها)</small><div class="big num">${money(
      sumAcc(b)
    )}</div><div class="delta">${
      lm ? 'وصول ‎− هزینه در ' + monthName(lm) + ': ' + money(flowIn(b, lm) - flowOut(b, lm)) : ''
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
      )}</div><span class="sub"><span class="pill good">وصول</span> <span class="pill">هزینه</span> — انتقال‌ها (بازپرداخت به مدیر) در این نمودار نیست</span></div>
    <div class="sec"><span>حساب‌ها</span></div><div class="card flat">${b.accounts
      .map(
        a =>
          `<div class="row"><span class="badge">${ico('bank')}</span><span class="t">${esc(
            a.name
          )}<small>${esc(a.card || 'نقدی')}</small></span><span class="amt">${money(
            a.balance
          )}</span></div>`
      )
      .join('')}</div>
    <div class="sec"><span>آخرین رکوردها</span></div><div class="card flat">${recs
      .map(
        r =>
          `<div class="row"><span class="t">${esc(r.title)}<small>${dateFa(r.date)} · ${esc(
            r.cat
          )}${r.type === 'transfer' ? ' · انتقال' : ''}</small></span><span class="amt ${
            r.type === 'income' ? 'pos' : r.type === 'expense' ? 'neg' : 'muted'
          }">${r.type === 'income' ? '+' : r.type === 'expense' ? '‎−' : '⇄'}${money(
            r.amount
          )}</span></div>`
      )
      .join('')}</div>`,
    fab: [{ a: 'sheet', data: 'data-n="incomeForm"', label: '+ دریافت متفرقه' }]
  }
}

/* ================= debts ================= */
BPAGES.dang = (R, b) => {
  const open = dangOpen(b)
  const done = b.dang.filter(d => d.paid)
  const row = d =>
    `<div class="row"><span class="t">${esc(d.title)}<small>${esc(d.cp)}${
      d.bridged ? ' · طلب در حساب شخصی' : ''
    }${d.paid ? ' · تسویه شد' : ''}</small></span><span class="amt ${
      d.paid ? 'pos' : 'neg'
    }">${money(d.amount)}</span>${
      d.paid
        ? ''
        : `<button class="btn sm primary" data-a="sheet" data-n="settleDang" data-u="${d.id}">تسویه از صندوق</button>`
    }</div>`
  const toMgr = open.filter(d => d.cp === 'مدیر')
  const others = open.filter(d => d.cp !== 'مدیر')
  return {
    title: 'بدهی ساختمان',
    html: `<div class="stats"><div class="stat"><small>جمع بدهی باز</small><b>${money(
      open.reduce((s, d) => s + d.amount, 0)
    )}</b></div><div class="stat"><small>به مدیر</small><b>${money(
      toMgr.reduce((s, d) => s + d.amount, 0)
    )}</b></div></div>
    <div class="sec"><span>به مدیر (هزینه از جیب)</span></div><div class="card flat">${
      toMgr.map(row).join('') || '<div class="row muted">بدهی بازی نیست</div>'
    }</div>
    ${
      others.length
        ? `<div class="sec"><span>سایر</span></div><div class="card flat">${others
            .map(row)
            .join('')}</div>`
        : ''
    }
    ${
      done.length
        ? `<div class="sec"><span>تسویه‌شده</span></div><div class="card flat">${done
            .map(row)
            .join('')}</div>`
        : ''
    }
    <p class="note">تسویه از صندوق = یک «انتقال» (بازپرداخت به مدیر)، نه هزینهٔ دوم؛ در گزارش هزینه‌ها دوبار حساب نمی‌شود.</p>`
  }
}
ACT.dosettle = () => {
  const b = curB()
  const d = UI.sheet.d
  settleDang(b, d.dangId, d.acc, d.pacc)
  UI.sheet = null
  toast('تسویه شد · موجودی صندوق کم شد' + (d.bridged ? ' · طلب شخصی هم دریافت شد' : ''))
}
