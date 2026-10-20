/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — publishable reports: group-chat text, CSV, entry from the reports page */
'use strict'
const LIM = 25
const lines = (title, rows, fmt) =>
  rows.length
    ? [
        '',
        title,
        ...rows.slice(0, LIM).map(fmt),
        ...(rows.length > LIM ? ['… و ' + fa(rows.length - LIM) + ' رکورد دیگر (در PDF)'] : [])
      ]
    : []
const head = (b, name, r) => [name + ' · ' + b.name, 'بازه: ' + r.label, '']
const recLine = x => '• ' + dateFa(x.date) + ' · ' + x.title + ' · ' + money(x.amount)
function reportText(b, kind) {
  const r = repRange(b)
  if (kind === 'annual') {
    const y = UI.f.ry || rpLatest(b).slice(0, 4)
    const a = annualData(b, y)
    return [
      'گزارش سالانه ' + fa(y).replace(/٬/g, '') + ' · ' + b.name,
      '',
      'درآمد سال: ' + money(a.whole.inTotal),
      'هزینهٔ سال: ' + money(a.whole.exTotal),
      'موجودی صندوق: ' + money(a.whole.opening) + ' ← ' + money(a.whole.closing),
      ...lines('هزینه‌ها به تفکیک دسته', a.cats, ([k, v]) => '• ' + k + ': ' + money(v)),
      '',
      'در پایان سال: ' +
        fa(a.debtors.length) +
        ' واحد بدهکار به مبلغ ' +
        money(a.debtors.reduce((s, x) => s + x.open, 0))
    ].join('\n')
  }
  if (kind === 'digest') {
    const d = digestData(b, r)
    const names = UI.f.rpNames === '1'
    return [
      ...head(b, 'گزارش دوره', r),
      'شارژ صادرشده: ' + money(d.billed),
      'وصول‌شده: ' + money(d.collected) + ' (' + fa(d.rate) + '٪)',
      'هزینه: ' + money(d.exTotal),
      'موجودی صندوق: ' + money(d.closing),
      ...lines(
        'هزینه‌ها به تفکیک دسته',
        d.cats.slice(0, 6),
        ([k, v]) => '• ' + k + ': ' + money(v)
      ),
      ...lines(
        'بدهکاران',
        d.debtors,
        x => '• ' + nameOrUnit(x, names) + ' · ' + fa(x.months) + ' ماه · ' + money(x.open)
      ),
      ...lines('طلبکاران (بدهی ساختمان)', d.creditors, x => '• ' + x.name + ': ' + money(x.amount))
    ].join('\n')
  }
  const d = stmtData(b, r.from, r.to)
  return [
    ...head(b, 'صورت‌حساب هزینه و درآمد', r),
    'درآمد: ' + money(d.inTotal),
    'هزینه: ' + money(d.exTotal),
    (d.inTotal >= d.exTotal ? 'مازاد: ' : 'کسری: ') + money(Math.abs(d.inTotal - d.exTotal)),
    'موجودی صندوق: ' + money(d.opening) + ' ← ' + money(d.closing),
    ...(UI.f.rpBrief === '1'
      ? []
      : [...lines('درآمدها', d.income, recLine), ...lines('هزینه‌ها', d.expense, recLine)])
  ].join('\n')
}
function csvRows(b, kind) {
  const r = repRange(b)
  if (kind === 'annual') {
    const a = annualData(b, UI.f.ry || rpLatest(b).slice(0, 4))
    return [
      ['ماه', 'صادرشده', 'درآمد', 'هزینه'],
      ...a.rows.map(x => [monthName(x.k), x.billed, x.inc, x.exp])
    ]
  }
  const d = stmtData(b, r.from, r.to)
  const rec = (t, x) => [t, x.date, x.title, x.cat || '', x.sub || '', x.amount]
  const base = [
    ['نوع', 'تاریخ', 'شرح', 'دسته', 'زیردسته', 'مبلغ'],
    ...d.income.map(x => rec('درآمد', x)),
    ...d.expense.map(x => rec('هزینه', x))
  ]
  if (kind !== 'digest') return base
  return [
    ...base,
    [],
    ['واحد', 'ماه بدهکار', 'مبلغ'],
    ...debtorsAt(b, r.to).map(x => [x.u.no, x.months, x.open]),
    [],
    ['طلبکار', 'مبلغ'],
    ...creditorsNow(b).map(x => [x.name, x.amount])
  ]
}
ACT.repcopy = d => {
  try {
    navigator.clipboard.writeText(reportText(curB(), d.k))
  } catch (e) {}
  toast('متن گزارش کپی شد؛ در گروه ساختمان بچسبان')
  return false
}
ACT.repcsv = d => {
  const csv =
    '﻿' +
    csvRows(curB(), d.k)
      .map(r => r.join(','))
      .join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'گزارش-' + d.k + '.csv'
  a.click()
  toast('فایل CSV ذخیره شد')
  return false
}
/* the reports page gets the three publishable reports on top */
const osReports = BPAGES.reports
BPAGES.reports = (R, b) => {
  const p = osReports(R, b)
  const link = (pg, t, s) =>
    `<button class="row" data-a="go" data-to="${bhash(
      b,
      pg
    )}"><span class="t">${t}<small>${s}</small></span>${ico('left')}</button>`
  p.html =
    `<div class="sec"><span>گزارش‌های قابل انتشار</span></div><div class="card flat">${link(
      'statement',
      'صورت‌حساب هزینه و درآمد',
      'ریز رکوردهای دوره · پیش‌فرض ' + monthLabel(rpLatest(b))
    )}${link('digest', 'گزارش جامع دوره', 'صورت‌حساب + بدهکاران + طلبکاران + صندوق')}${link(
      'annual',
      'گزارش سالانه',
      'ماه‌به‌ماه، دسته‌ها، بزرگ‌ترین هزینه‌ها'
    )}</div><div class="sec"><span>نمودارها و جدول‌ها</span></div>` + p.html
  return p
}
