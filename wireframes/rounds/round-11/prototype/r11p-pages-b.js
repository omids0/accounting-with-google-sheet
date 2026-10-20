/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — unit page, residents, charges */
'use strict'
/* ================= unit page ================= */
BPAGES.unit = (R, b) => {
  const u = unitById(b, R.arg)
  if (!u) return { title: 'واحد', back: bhash(b, 'units'), html: emptyBox('واحد پیدا نشد', '') }
  const seg = UI.f.seg || 'statement'
  const d = chargeDebtor(b, u)
  const bal = unitBalance(b, u.id)
  const occ = occupantOf(b, u)
  const owner = personById(b, u.ownerId)
  const segs = [
    ['statement', 'صورت‌حساب'],
    ['history', 'سابقه'],
    ['residents', 'ساکنان'],
    ['specs', 'مشخصات']
  ]
  const top = `<div class="card"><div style="display:flex;gap:10px;align-items:center"><span class="badge ${
    bal.open > 0 ? 'debt' : ''
  }">${fa(u.no)}</span><div style="flex:1"><b>${
    occ ? esc(occ.person.name) + ' · ' + roleLabel(occ.role) : 'واحد خالی'
  }</b><span class="sub">مالک: ${esc(owner ? owner.name : '—')} · ط${fa(u.floor)} · ${fa(
    u.area
  )} متر</span></div><div style="text-align:left"><b class="${bal.open > 0 ? 'neg' : 'pos'}">${
    bal.open > 0 ? '‎−' + money(bal.open) : '✓'
  }</b>${bal.credit ? `<span class="sub pos">اعتبار ${money(bal.credit)}</span>` : ''}</div></div>
  <div class="btns" style="margin-top:10px"><button class="btn primary" data-a="payopen" data-u="${
    u.id
  }">ثبت پرداخت</button><button class="btn" data-a="copytext" data-k="statement" data-u="${
    u.id
  }">${ico('share', 'sm')} اشتراک صورت‌حساب</button></div>
  ${
    bal.open > 0
      ? `<button class="btn sm block" style="margin-top:8px" data-a="copytext" data-k="remind" data-u="${u.id}">یادآوری (متن آماده)</button>`
      : ''
  }</div>
  <div class="seg">${segs
    .map(
      ([k, l]) =>
        `<button class="${
          seg === k ? 'on' : ''
        }" data-a="setf" data-k="seg" data-v="${k}">${l}</button>`
    )
    .join('')}</div>`
  let body = ''
  if (seg === 'statement') {
    const open = b.rec
      .filter(r => r.unitId === u.id && openOf(r) > 0)
      .sort((x, y) => x.month.localeCompare(y.month))
    const paidRecent = b.rec
      .filter(r => r.unitId === u.id)
      .flatMap(r => r.paid.map(p => ({ r, p })))
      .sort((x, y) => y.p.date.localeCompare(x.p.date))
      .slice(0, 4)
    const acc = b.accounts[0]
    body = `<div class="card flat">${
      open.length
        ? open
            .map(
              r =>
                `<div class="row"><span class="t">${esc(
                  r.title.replace(' · واحد ' + fa(u.no), '')
                )}<small>${
                  r.ref.startsWith('share:')
                    ? r.debtorId === u.ownerId
                      ? 'سهم ' + (r.sub || '') + ' · به نام مالک'
                      : 'سهم ' + (r.sub || '')
                    : 'سررسید ' + dateFa(r.due)
                }${
                  paidOf(r) ? ' · پرداخت‌شده ' + money(paidOf(r)) : ''
                }</small></span><span class="amt neg">${money(openOf(r))}</span></div>`
            )
            .join('')
        : '<div class="row"><span class="t pos">بدهی بازی ندارد ✓</span></div>'
    }
    <div class="row"><span class="t">جمع بدهی</span><span class="amt ${amtCls(bal.open)}">${money(
      bal.open
    )}</span></div></div>
    ${
      paidRecent.length
        ? `<div class="sec"><span>پرداخت‌های اخیر</span></div><div class="card flat">${paidRecent
            .map(
              x =>
                `<div class="row"><span class="t">${esc(
                  x.r.title.replace(' · واحد ' + fa(u.no), '')
                )}<small>${dateFa(x.p.date)}${x.p.fromCredit ? ' · از اعتبار' : ''}${
                  x.p.viaSms ? ' · از پیامک' : ''
                }</small></span><span class="amt pos">${money(x.p.amt)}</span></div>`
            )
            .join('')}</div>`
        : ''
    }
    <p class="note">کارت صندوق برای واریز: ${esc(acc && acc.card ? acc.card : '—')}</p>`
  } else if (seg === 'history') {
    const all = b.rec.filter(r => r.unitId === u.id).sort((x, y) => y.month.localeCompare(x.month))
    body = `<div class="card flat">${
      all
        .map(
          r =>
            `<div class="row"><span class="t">${esc(r.title)}<small>${
              paidOf(r) >= r.amount
                ? 'تسویه شد'
                : paidOf(r)
                ? 'ناقص · ' + money(paidOf(r)) + ' پرداخت شده'
                : 'باز'
            }${r.paid.some(p => p.forgiven) ? ' · بخشودگی' : ''}</small></span><span class="amt ${
              openOf(r) > 0 ? 'neg' : 'pos'
            }">${money(r.amount)}</span></div>`
        )
        .join('') || '<div class="row muted">سابقه‌ای نیست</div>'
    }</div>`
  } else if (seg === 'residents') {
    const stays = b.stays
      .filter(s => s.unitId === u.id)
      .sort((x, y) => y.from.localeCompare(x.from))
    body = `<div class="card flat">${
      stays
        .map(
          s =>
            `<div class="row">${avatarOf(personById(b, s.personId).name)}<span class="t">${esc(
              personById(b, s.personId).name
            )}<small>${roleLabel(s.role)} · از ${dateFa(s.from)}${
              s.to ? ' تا ' + dateFa(s.to) : ' · فعلی'
            }</small></span></div>`
        )
        .join('') || '<div class="row muted">ساکنی ثبت نشده</div>'
    }</div>
    <button class="btn block" data-a="changeres" data-u="${u.id}">تغییر ساکن</button>`
  } else
    body = `<div class="card flat">${[
      ['شماره', fa(u.no)],
      ['طبقه', fa(u.floor)],
      ['متراژ', fa(u.area) + ' متر'],
      ['نفرات', fa(u.people)],
      ['پارکینگ', fa(u.parking)],
      ['انباری', fa(u.storage)],
      ['شارژ ماهانه', money(unitCharge(b, u))],
      ['مالک', owner ? owner.name : '—']
    ]
      .map(
        ([k, v]) =>
          `<div class="row"><span class="t muted">${k}</span><span class="amt">${v}</span></div>`
      )
      .join('')}</div>
    <button class="btn block" data-a="sheet" data-n="unitForm" data-u="${
      u.id
    }" data-edit="1">ویرایش مشخصات</button>`
  return { title: 'واحد ' + fa(u.no), back: bhash(b, 'units'), html: top + body }
}
ACT.copytext = d => {
  const b = curB()
  const u = unitById(b, d.u)
  const bal = unitBalance(b, u.id)
  const t =
    d.k === 'statement'
      ? statementText(b, u.id)
      : 'سلام ' +
        (chargeDebtor(b, u)?.person.name || '') +
        ' عزیز، یادآوری شارژ ساختمان ' +
        b.name +
        ': بدهی واحد ' +
        fa(u.no) +
        ' مبلغ ' +
        money(bal.open) +
        ' تومان است. کارت: ' +
        (b.accounts[0].card || '')
  try {
    navigator.clipboard.writeText(t)
  } catch (e) {}
  openSheet(
    'textShare',
    {},
    { text: t, title: d.k === 'statement' ? 'اشتراک صورت‌حساب' : 'متن یادآوری' }
  )
  return false
}
ACT.payopen = d => {
  const b = curB()
  const u = unitById(b, d.u)
  const bal = unitBalance(b, u.id)
  const de = chargeDebtor(b, u)
  openSheet('pay', {
    unitId: u.id,
    amount: bal.open || unitCharge(b, u),
    acc: S.lastAcc?.[b.id] || b.accounts[0].id,
    mine: !!(de && de.person.me),
    bridge: !!S.bridgePref?.mine,
    phase: 1,
    credit: true
  })
  return false
}
ACT.changeres = d => {
  const b = curB()
  openSheet('changeRes', {
    unitId: d.u,
    personId: '',
    name: '',
    phone: '',
    role: 'tenant',
    from: TODAY,
    debt: 'keep'
  })
  return false
}

/* ================= residents ================= */
BPAGES.residents = (R, b) => {
  const flt = UI.f.rf || 'all'
  const rows = []
  b.units.forEach(u => {
    const occ = occupantOf(b, u)
    const ow = personById(b, u.ownerId)
    if (occ) rows.push({ u, p: occ.person, role: occ.role, from: occ.from, cur: true })
    if (ow && !(occ && occ.person.id === ow.id))
      rows.push({ u, p: ow, role: 'owner', from: '', cur: true, absent: true })
  })
  const past = b.stays
    .filter(s => s.to)
    .map(s => ({
      u: unitById(b, s.unitId),
      p: personById(b, s.personId),
      role: s.role,
      from: s.from,
      to: s.to,
      cur: false
    }))
  const list = flt === 'past' ? past : rows.filter(r => flt === 'all' || r.role === flt)
  const cnt = k =>
    k === 'past' ? past.length : rows.filter(r => k === 'all' || r.role === k).length
  const chip = (k, l) =>
    `<button class="chip ${
      flt === k ? 'on' : ''
    }" data-a="setf" data-k="rf" data-v="${k}">${l} ${fa(cnt(k))}</button>`
  return {
    title: 'ساکنان',
    html: `<div class="chips">${chip('all', 'همه')}${chip('owner', 'مالک')}${chip(
      'tenant',
      'مستأجر'
    )}${chip('past', 'قبلی‌ها')}</div>
    <div class="card flat">${
      list
        .map(
          r =>
            `<div class="row">${avatarOf(r.p.name)}<span class="t">${esc(
              r.p.name
            )}<small>${roleLabel(r.role)}${r.absent ? ' (غیرساکن)' : ''} · ${esc(
              r.p.phone || r.p.card || '—'
            )} · واحد ${fa(r.u.no)}${r.from ? ' · از ' + dateFa(r.from) : ''}${
              r.to ? ' تا ' + dateFa(r.to) : ''
            }</small></span><button class="ibtn flat" data-a="resmenu" data-u="${r.u.id}" data-p="${
              r.p.id
            }" aria-label="گزینه‌ها">${ico('more')}</button></div>`
        )
        .join('') || '<div class="row muted">موردی نیست</div>'
    }</div>
    <p class="note">هر نفر = طرف حساب همین ساختمان + نقش + واحد + ورود/خروج. «قبلی‌ها» = خروج‌کرده‌ها با تاریخ.</p>`,
    fab: [{ a: 'sheet', data: 'data-n="addRes"', label: '+ ساکن' }]
  }
}
ACT.resmenu = d => {
  openSheet('resMenu', {}, { u: d.u, p: d.p })
  return false
}
