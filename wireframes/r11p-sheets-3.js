/* eslint-disable -- prototype scripts share globals, not part of the app source */
SHEETS.expenseForm = (s, b) => {
  const d = s.d
  const cats = Object.keys(BUILDING_CATS.expense).filter(c => c !== 'انتقال')
  const subs = BUILDING_CATS.expense[d.cat] || []
  const cps = [
    { value: '', label: 'بدون طرف حساب' },
    ...b.people.filter(p => p.kind === 'contractor').map(p => ({ value: p.name, label: p.name })),
    { value: '__m', label: '', manage: bhash(b, 'counterparties'), hidden: 0 }
  ]
  cps[cps.length - 1].label = '+ طرف حساب جدید…'
  const units = b.units.filter(u => u.active)
  const parts = d.splitOn ? splitExpense(Number(d.amount), units, d.mode, d.manual) : {}
  const kindOpts = [
    ...optsFrom(b.lists.expenseKinds),
    { manage: bhash(b, 'settings') + '?s=lists', label: 'مدیریت فهرست…', value: '__mk' }
  ]
  const payerOpts = [
    ...optsFrom(b.lists.payers),
    { manage: bhash(b, 'settings') + '?s=lists', label: 'مدیریت فهرست…', value: '__mp' }
  ]
  const dup = b.recs.find(
    r => r.type === 'expense' && r.title === d.title && r.amount === Number(d.amount) && d.title
  )
  const kind = kindOf(b, d.kind)
  return {
    title: 'هزینهٔ ساختمان',
    full: true,
    body: `${txt('عنوان', 'd.title', { ph: 'مثلاً تعمیر پمپ آب' })}
    <div class="grid2">${txt('مبلغ (تومان)', 'd.amount', { amount: 1, num: 1 })}${txt(
      'تاریخ',
      'd.date'
    )}</div>
    ${
      dup
        ? '<div class="guide"><b>هزینهٔ مشابه قبلاً ثبت شده</b>عنوان و مبلغ یکسان است؛ مطمئن شو تکراری نیست.</div><div style="height:8px"></div>'
        : ''
    }
    <div class="grid2">${sel(
      'دسته',
      'd.cat',
      cats.map(c => ({ value: c, label: c })),
      { after: 'catChanged', id: 'ec' }
    )}${
      subs.length
        ? sel(
            'زیردسته',
            'd.sub',
            subs.map(c => ({ value: c, label: c })),
            { id: 'es' }
          )
        : '<div></div>'
    }</div>
    <div class="sec"><span>آیتم‌ها (اختیاری)</span><button data-a="itemsum">مبلغ = جمع آیتم‌ها</button></div>
    ${d.items
      .map(
        (it, i) =>
          `<div style="display:grid;grid-template-columns:2fr 1fr 1.4fr auto;gap:6px;margin-bottom:6px;align-items:center"><input class="input" placeholder="شرح" data-bind="d.items.${i}.name" value="${esc(
            it.name
          )}"/><input class="input" inputmode="numeric" data-num="1" data-bind="d.items.${i}.qty" value="${esc(
            it.qty
          )}"/><input class="input" inputmode="numeric" data-num="1" data-bind="d.items.${i}.price" value="${esc(
            it.price
          )}" placeholder="قیمت واحد"/><button class="ibtn flat" data-a="delitem" data-i="${i}" aria-label="حذف">${ico(
            'trash'
          )}</button></div>`
      )
      .join('')}
    <button class="btn sm" data-a="additem">+ آیتم</button>
    <div style="height:10px"></div>
    ${sel('طرف حساب (پیمانکار)', 'd.cp', cps, { id: 'ecp' })}
    <div class="grid2">${sel('نوع هزینه', 'd.kind', kindOpts, {
      id: 'ek',
      hint: kind ? 'سهم واحدها به ' + (kind.chargeTo === 'owner' ? 'مالک' : 'ساکن') + ' می‌رسد' : ''
    })}${sel('پرداخت‌کننده', 'd.payer', payerOpts, { id: 'ep' })}</div>
    ${
      d.payer === 'fund'
        ? sel('از حساب', 'd.acc', accOptions(b), { after: 'accPick', id: 'eacc' })
        : `<div class="card" style="margin-bottom:10px"><span class="sub">پول از صندوق خارج نمی‌شود؛ یک بدهی به «${esc(
            payerLabel(b, d.payer)
          )}» ساخته می‌شود.</span>${tog(
            'در حساب شخصی من: طلب از «' + esc(b.name) + '»',
            'd.bridge',
            'پل الف — اختیاری'
          )}</div>`
    }
    ${sel('تکرار', 'd.recurring', REC_OPTS, { id: 'er' })}
    ${tog('پیوست: عکس فاکتور', 'd.attach', d.attach ? 'فاکتور.jpg (نمونه) ضمیمه شد' : '')}
    ${tog('تقسیم بین واحدها', 'd.splitOn', 'برای هر واحد یک سهم (بدهی) صادر می‌شود')}
    ${
      d.splitOn
        ? `${sel('روش تقسیم', 'd.mode', SPLIT_MODES, {
            id: 'em'
          })}<button class="btn sm" data-a="togprev">${
            d.showPrev ? 'بستن پیش‌نمایش' : 'پیش‌نمایش ›'
          }</button>${
            d.showPrev || d.mode === 'manual'
              ? `<div class="card flat" style="margin-top:8px"><table class="tbl" style="padding:0 8px"><tr><th>واحد</th><th>بدهکار</th><th>سهم</th></tr>${units
                  .map(u => {
                    const de = shareDebtor(b, d.kind, u)
                    return `<tr><td>${fa(u.no)}</td><td>${esc(de ? de.person.name : '—')}${
                      de && kind && kind.chargeTo === 'owner' ? ' (مالک)' : ''
                    }</td><td>${
                      d.mode === 'manual'
                        ? `<input class="input" style="min-height:32px;padding:4px 8px" inputmode="numeric" data-num="1" data-bind="d.manual.${
                            u.id
                          }" value="${esc(d.manual[u.id] || '')}"/>`
                        : money(parts[u.id] || 0)
                    }</td></tr>`
                  })
                  .join('')}</table></div><div class="split-sum"><span>جمع سهم‌ها</span><span>${
                  d.mode === 'manual'
                    ? 'ورودی دستی'
                    : money(Object.values(parts).reduce((a, c) => a + c, 0))
                }</span></div>`
              : ''
          }`
        : ''
    }
    ${d.err ? `<p class="neg">${d.err}</p>` : ''}`,
    foot: `${closeBtn}<button class="btn primary" data-a="saveexp">ثبت هزینه</button>`
  }
}

ACT.togprev = () => {
  UI.sheet.d.showPrev = !UI.sheet.d.showPrev
}
SHEETS.expDetail = (s, b) => {
  const r = b.recs.find(x => x.id === s.p.r)
  if (!r) return { title: 'هزینه', body: '', foot: closeBtn }
  const shares = b.rec.filter(x => (x.ref || '').endsWith(':' + r.id))
  const d = s.d
  return {
    title: r.title,
    body: `<div class="card flat">${[
      ['مبلغ', money(r.amount)],
      ['دسته', r.cat + (r.sub ? ' › ' + r.sub : '')],
      ['نوع', kindLabel(b, r.kind)],
      ['پرداخت‌کننده', payerLabel(b, r.payer)],
      ['طرف حساب', r.cp || '—'],
      ['تاریخ', dateFa(r.date)],
      ['پیوست', r.attach ? 'فاکتور.jpg 📎' : '—'],
      ['تکرار', r.recurring ? REC_OPTS.find(o => o.value === r.recurring).label : '—']
    ]
      .map(
        ([k, v]) =>
          `<div class="row"><span class="t muted">${k}</span><span class="amt">${esc(
            v
          )}</span></div>`
      )
      .join('')}</div>
    ${
      shares.length
        ? `<div class="sec"><span>سهم واحدها (${fa(
            shares.length
          )})</span></div><div class="card flat"><table class="tbl" style="padding:0 8px"><tr><th>واحد</th><th>بدهکار</th><th>سهم</th><th>وضعیت</th></tr>${shares
            .map(
              x =>
                `<tr><td>${fa(unitById(b, x.unitId).no)}</td><td>${esc(
                  personById(b, x.debtorId).name
                )}</td><td>${money(x.amount)}</td><td>${
                  openOf(x) <= 0
                    ? '<span class="pill good">پرداخت شد</span>'
                    : paidOf(x)
                    ? '<span class="pill warn">ناقص</span>'
                    : '<span class="pill bad">باز</span>'
                }</td></tr>`
            )
            .join('')}</table></div>`
        : ''
    }
    ${
      d.editAmt
        ? `<div style="margin-top:10px">${txt('مبلغ جدید', 'd.amount', {
            amount: 1,
            num: 1,
            hint: 'فقط سهم‌های پرداخت‌نشده بازمحاسبه می‌شوند'
          })}<button class="btn primary block" data-a="saveamt" data-r="${
            r.id
          }">ذخیرهٔ مبلغ</button></div>`
        : ''
    }
    ${
      d.confirmDel
        ? `<div class="guide" style="margin-top:10px"><b>حذف هزینه؟</b>${
            shares.filter(x => !x.paid.length).length
          } سهم پرداخت‌نشده حذف می‌شود؛ سهم‌های پرداخت‌شده می‌مانند.<div class="btns" style="margin-top:8px"><button class="btn danger" data-a="delexp" data-r="${
            r.id
          }">بله، حذف شود</button></div></div>`
        : ''
    }`,
    foot: `${closeBtn}<button class="btn" data-a="editamt">ویرایش مبلغ</button><button class="btn danger" data-a="askdel">حذف</button>`
  }
}
ACT.askdel = () => {
  UI.sheet.d.confirmDel = true
}
SHEETS.incomeForm = (s, b) => ({
  title: 'دریافت متفرقه',
  body: `${txt('عنوان', 'd.title', { ph: 'مثلاً اجارهٔ پشت‌بام' })}${txt(
    'مبلغ (تومان)',
    'd.amount',
    { amount: 1, num: 1 }
  )}${sel(
    'دسته',
    'd.cat',
    BUILDING_CATS.income
      .filter(c => !['شارژ ساختمان', 'طلب'].includes(c))
      .map(c => ({ value: c, label: c })),
    { id: 'ic' }
  )}${sel('به حساب', 'd.acc', accOptions(b), { id: 'iacc', up: true })}`,
  foot: `${closeBtn}<button class="btn primary" data-a="saveinc">ثبت</button>`
})
ACT.saveinc = () => {
  const b = curB()
  const d = UI.sheet.d
  if (!(Number(d.amount) > 0)) return toast('مبلغ را وارد کنید'), false
  addRec(b, {
    type: 'income',
    date: TODAY,
    title: d.title || d.cat,
    amount: Number(d.amount),
    cat: d.cat,
    acc: d.acc
  })
  UI.sheet = null
  toast('دریافت ثبت شد')
}
SHEETS.personForm = s => ({
  title: 'طرف حساب جدید',
  body: `${txt('نام', 'd.name')}${txt('تلفن', 'd.phone', { tel: 1 })}${txt(
    'شمارهٔ کارت',
    'd.card',
    { tel: 1 }
  )}${sel('نوع', 'd.kind', PERSON_KINDS, { id: 'pk' })}${
    s.d.kind === 'resident'
      ? chk('من (این طرف حساب خود مدیر است؛ برای پل شارژ واحد من)', 'd.me')
      : ''
  }`,
  foot: `${closeBtn}<button class="btn primary" data-a="saveperson">ذخیره</button>`
})
ACT.saveperson = () => {
  const d = UI.sheet.d
  if (!d.name.trim()) return toast('نام را وارد کنید'), false
  addPerson(curB(), d.name.trim(), d.kind, { phone: d.phone, card: d.card, me: d.me })
  UI.sheet = null
  toast('طرف حساب افزوده شد')
}
SHEETS.checkForm = (s, b) => ({
  title: 'چک جدید',
  body: `${sel(
    'در وجه',
    'd.payee',
    b.people.filter(p => p.kind === 'contractor').map(p => ({ value: p.name, label: p.name })),
    { id: 'cpay', ph: 'انتخاب پیمانکار' }
  )}${txt('مبلغ', 'd.amount', { amount: 1, num: 1 })}${txt('سررسید', 'd.due')}${sel(
    'از حساب',
    'd.acc',
    accOptions(b),
    { id: 'cacc', up: true }
  )}${txt('یادداشت', 'd.note')}`,
  foot: `${closeBtn}<button class="btn primary" data-a="savecheck">ذخیره</button>`
})
