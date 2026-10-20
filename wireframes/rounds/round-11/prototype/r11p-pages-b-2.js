/* eslint-disable -- prototype scripts share globals, not part of the app source */
ACT.exitres = d => {
  const b = curB()
  const s = occupantStay(b, d.u)
  if (s) {
    s.to = TODAY
    logAct(b, 'خروج ساکن از واحد ' + fa(unitById(b, d.u).no))
    toast('واحد ' + fa(unitById(b, d.u).no) + ' خالی شد')
  }
  UI.sheet = null
}
ACT.applychange = () => {
  const b = curB()
  const d = UI.sheet.d
  const u = unitById(b, d.unitId)
  let person = personById(b, d.personId)
  if (d.personId === '__new') {
    if (!d.name.trim()) return toast('نام را وارد کنید'), false
    person = addPerson(b, d.name.trim(), 'resident', { phone: d.phone })
  }
  if (!person) return toast('یک نفر انتخاب کنید'), false
  const old = occupantStay(b, u.id)
  if (old) old.to = d.from
  const bal = unitBalance(b, u.id)
  if (bal.open > 0 && d.debt === 'to-owner')
    b.rec.filter(r => r.unitId === u.id && openOf(r) > 0).forEach(r => (r.debtorId = u.ownerId))
  if (bal.open > 0 && d.debt === 'forgive')
    b.rec
      .filter(r => r.unitId === u.id && openOf(r) > 0)
      .forEach(r =>
        r.paid.push({ id: uid('pm'), amt: openOf(r), date: TODAY, acc: null, forgiven: true })
      )
  b.stays.push({
    id: uid('s'),
    unitId: u.id,
    personId: person.id,
    role: d.role,
    from: d.from,
    to: null
  })
  logAct(b, 'ساکن واحد ' + fa(u.no) + ' تغییر کرد: ' + person.name)
  UI.sheet = null
  toast(
    'ساکن واحد ' +
      fa(u.no) +
      ' تغییر کرد' +
      (bal.open > 0
        ? ' · بدهی: ' +
          { keep: 'می‌ماند', 'to-owner': 'به مالک منتقل شد', forgive: 'بخشوده شد' }[d.debt]
        : '')
  )
}

/* ================= charges ================= */
BPAGES.charges = (R, b) => {
  const miss = missingIssueMonths(b)
  const issueCard = miss.length
    ? `<div class="guide"><b>شارژ ${monthName(miss[0])} صادر نشده</b>سررسید پیش‌فرض: ${fa(
        b.profile.dueDay
      )} هر ماه.<div class="btns" style="margin-top:8px"><button class="btn primary sm" data-a="sheet" data-n="issue" data-m="${
        miss[0]
      }">بررسی و صدور</button></div></div>`
    : ''
  const cards = chargeMonths(b)
    .map(k => {
      const ms = monthSummary(b, k)
      const pct = ms.billed ? Math.round((ms.paid / ms.billed) * 100) : 0
      return `<button class="card" style="text-align:right;width:100%;font:inherit;color:inherit" data-a="monthunits" data-m="${k}"><b>${monthLabel(
        k
      )}</b><span class="sub">${fa(ms.units)} واحد · سررسید ${
        ms.due ? dateFa(ms.due) : '—'
      }</span><div style="display:flex;justify-content:space-between;margin-top:6px"><span>صادر شده</span><b>${money(
        ms.billed
      )}</b></div><div class="bar" style="margin:6px 0"><i style="width:${pct}%"></i></div><span class="sub">وصول ${money(
        ms.paid
      )} · ${fa(ms.openUnits)} واحد مانده${
        ms.partial ? ' · ' + fa(ms.partial) + ' ناقص' : ''
      }</span></button>`
    })
    .join('')
  const credits = b.units.filter(u => u.credit > 0)
  return {
    title: 'شارژ',
    html: `${issueCard}${
      cards || emptyBox('هنوز شارژی صادر نشده', 'از دکمهٔ شناور شارژ ماه را صادر کن.')
    }${
      credits.length
        ? `<div class="sec"><span>اعتبار واحدها</span></div><div class="card flat">${credits
            .map(
              u =>
                `<div class="row"><span class="t">واحد ${fa(
                  u.no
                )}<small>در صدور بعدی خودکار کسر می‌شود</small></span><span class="amt pos">${money(
                  u.credit
                )}</span></div>`
            )
            .join('')}</div>`
        : ''
    }
    <p class="note">لمس هر ماه: وضعیت واحدها و ثبت پرداخت. امروز: ${dateFa(
      TODAY
    )} · صدور خودکار با ورود به ماه جدید (برای مدیر) انجام می‌شود.</p><button class="btn block" data-a="nextmonth">⏭ شبیه‌سازی: رفتن به ماه بعد (${monthName(
      nextMonth(TODAY.slice(0, 7))
    )})</button>`,
    fab: [{ a: 'sheet', data: 'data-n="issue"', label: 'صدور شارژ' }]
  }
}
ACT.monthunits = d => {
  openSheet('monthUnits', {}, { m: d.m })
  return false
}
ACT.doissue = () => {
  const b = curB()
  const d = UI.sheet.d
  const due = d.month + '-' + pad(Number(d.dueDay))
  const n = issueCharges(b, d.month, due, d.note)
  UI.sheet = null
  toast(
    n
      ? 'شارژ ' + monthName(d.month) + ' برای ' + fa(n) + ' واحد صادر شد'
      : 'همهٔ واحدها قبلاً صادر شده‌اند (تکراری ساخته نشد)'
  )
}
