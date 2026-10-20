/* eslint-disable -- prototype scripts share globals, not part of the app source */
SHEETS.pay = (s, b) => {
  const d = s.d
  const u = unitById(b, d.unitId)
  const bal = unitBalance(b, u.id)
  const de = chargeDebtor(b, u)
  const head = `<div class="card" style="margin-bottom:10px"><b>واحد ${fa(u.no)} · ${esc(
    de ? de.person.name : '—'
  )}</b><span class="sub">بدهی باز: ${money(bal.open)}${
    bal.credit ? ' · اعتبار ' + money(bal.credit) : ''
  }</span></div>`
  if (d.phase === 1)
    return {
      title: 'ثبت پرداخت',
      body: `${head}${txt('مبلغ (تومان)', 'd.amount', { amount: 1, num: 1 })}
      <div class="chips" style="margin-bottom:10px"><button class="chip" data-a="paychip" data-v="${
        bal.open
      }">کل بدهی ${money(
        bal.open
      )}</button><button class="chip" data-a="paychip" data-v="${unitCharge(b, u)}">یک ماه ${money(
        unitCharge(b, u)
      )}</button></div>
      ${sel('واریز به حساب', 'd.acc', accOptions(b), { after: 'accPick', up: true })}
      ${
        d.mine
          ? `<div class="card" style="margin-top:10px">${tog(
              'در حساب شخصی من: هزینهٔ «خانه › شارژ»',
              'd.bridge',
              'این واحد مال خودتان است (پل ب)؛ انتخاب شما یادآوری می‌شود'
            )}</div>`
          : ''
      }`,
      foot: `${closeBtn}<button class="btn primary" data-a="paynext">ادامه</button>`
    }
  const alloc = allocatePayment(b, u.id, Number(d.amount))
  const dup = b.recs.find(r => r.viaSms && r.unitId === u.id && r.amount === Number(d.amount))
  return {
    title: 'تأیید پرداخت',
    body: `${head}<div class="card flat">${
      alloc.parts
        .map(
          p =>
            `<div class="row"><span class="t">${esc(p.rec.title)}<small>${
              paidOf(p.rec)
                ? 'تکمیل بخش باقی‌مانده'
                : p.use < openOf(p.rec)
                ? 'پرداخت ناقص'
                : 'تسویه کامل'
            }</small></span><span class="amt pos">${money(p.use)}</span></div>`
        )
        .join('') || '<div class="row muted">بدهی بازی نیست</div>'
    }</div>
    ${
      alloc.overflow > 0
        ? `<div class="guide" style="margin-top:10px"><b>${money(
            alloc.overflow
          )} بیشتر از بدهی است</b>${tog(
            'ثبت اضافه به‌عنوان اعتبار واحد',
            'd.credit',
            'در صدور بعدی خودکار کسر می‌شود'
          )}</div>`
        : ''
    }
    ${
      dup
        ? '<div class="guide" style="margin-top:10px"><b>پرداخت مشابهی از پیامک ثبت شده</b>ممکن است تکراری باشد.</div>'
        : ''
    }
    <p class="note">تخصیص از قدیمی‌ترین بدهی شروع می‌شود؛ پرداخت ناقص مجاز است.</p>`,
    foot: `<button class="btn" data-a="payback">ویرایش مبلغ</button><button class="btn primary" data-a="paysave" ${
      Number(d.amount) > 0 ? '' : 'disabled'
    }>ثبت پرداخت</button>`
  }
}
ACT.paychip = d => {
  UI.sheet.d.amount = Number(d.v)
}
ACT.paynext = () => {
  if (!(Number(UI.sheet.d.amount) > 0)) return toast('مبلغ را وارد کنید'), false
  UI.sheet.d.phase = 2
}
ACT.payback = () => {
  UI.sheet.d.phase = 1
}
ACT.paysave = () => {
  const b = curB()
  const d = UI.sheet.d
  const res = payUnit(b, d.unitId, Number(d.amount), d.acc, { credit: d.credit })
  S.bridgePref = Object.assign(S.bridgePref || {}, { mine: !!d.bridge })
  if (d.mine && d.bridge) bridgeMyCharge(b, res)
  const text = receiptText(b, res)
  openSheet('receipt', {}, { res, text, mine: d.mine && d.bridge })
  return false
}
SHEETS.receipt = (s, b) => {
  const r = s.p.res
  return {
    title: 'رسید پرداخت',
    body: `<div class="receipt"><h3>رسید پرداخت · ${dateFa(r.date)}</h3>واحد ${fa(
      r.unit.no
    )} · ${esc(r.debtor ? r.debtor.name : '')}<br/><b>${money(r.amount)} تومان</b> بابت ${
      r.months.length ? r.months.map(monthName).join('، ') : 'اعتبار شارژ'
    }${r.credit ? `<br/>(اعتبار ثبت‌شده: ${money(r.credit)})` : ''}<br/>واریز به ${esc(
      r.acc.name
    )}<br/>ماندهٔ بدهی: ${money(r.remaining)} تومان</div>
    ${s.p.mine ? '<p class="note pos">هزینهٔ «خانه › شارژ» در حساب شخصی شما هم ثبت شد.</p>' : ''}
    <div class="btns" style="margin-top:12px"><button class="btn primary" data-a="copy" data-text="${esc(
      s.p.text
    )}">${ico(
      'share',
      'sm'
    )} اشتراک رسید (متن)</button><button class="btn" data-a="receiptpng">تصویر (PNG)</button></div>`,
    foot: closeBtn
  }
}
ACT.receiptpng = () => {
  const lines = UI.sheet.p.text.split('\n')
  const c = document.createElement('canvas')
  c.width = 720
  c.height = 90 + lines.length * 54
  const x = c.getContext('2d')
  x.fillStyle = '#f0fdfa'
  x.fillRect(0, 0, c.width, c.height)
  x.strokeStyle = '#0f766e'
  x.setLineDash([8, 6])
  x.lineWidth = 3
  x.strokeRect(12, 12, c.width - 24, c.height - 24)
  x.fillStyle = '#134e4a'
  x.direction = 'rtl'
  x.textAlign = 'right'
  x.font = '600 28px Vazirmatn, Tahoma, sans-serif'
  lines.forEach((l, i) => x.fillText(l, 680, 70 + i * 54))
  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = 'رسید-پرداخت.png'
  a.click()
  toast('تصویر رسید ذخیره شد')
  return false
}
SHEETS.textShare = s => ({
  title: s.p.title,
  body: `<pre style="white-space:pre-wrap;font:inherit;background:var(--color-accent-soft);border-radius:12px;padding:12px;margin:0">${esc(
    s.p.text
  )}</pre><p class="note">متن کپی شد؛ در پیام‌رسان بچسبانید (اپ پیامک نمی‌فرستد).</p>`,
  foot: `${closeBtn}<button class="btn primary" data-a="copy" data-text="${esc(
    s.p.text
  )}">کپی دوباره</button>`
})
SHEETS.changeRes = (s, b) => {
  const d = s.d
  const u = unitById(b, d.unitId)
  const bal = unitBalance(b, d.unitId)
  const pick = s.p.pickUnit
    ? sel(
        'واحد',
        'd.unitId',
        b.units.map(x => ({
          value: x.id,
          label: 'واحد ' + fa(x.no) + (occupantStay(b, x.id) ? '' : ' (خالی)')
        })),
        { id: 'cu' }
      )
    : `<div class="card" style="margin-bottom:10px"><b>واحد ${fa(
        u.no
      )}</b><span class="sub">ساکن فعلی: ${
        occupantOf(b, u) ? esc(occupantOf(b, u).person.name) : 'خالی'
      }</span></div>`
  return {
    title: s.p.pickUnit ? 'ساکن جدید' : 'تغییر ساکن',
    full: true,
    body: `${pick}${sel('ساکن جدید', 'd.personId', personOptions(b), { ph: 'انتخاب' })}
    ${
      d.personId === '__new'
        ? `<div class="card" style="margin-bottom:10px">${txt('نام', 'd.name')}${txt(
            'تلفن',
            'd.phone',
            { tel: 1 }
          )}</div>`
        : ''
    }
    ${sel('نقش', 'd.role', RESIDENT_ROLES)}${txt('تاریخ ورود', 'd.from')}
    ${
      bal.open > 0
        ? `<div class="guide"><b>این واحد ${money(bal.open)} بدهی باز دارد</b>${sel(
            'تکلیف بدهی',
            'd.debt',
            DEBT_MODES,
            { up: true }
          )}</div>`
        : ''
    }`,
    foot: `${closeBtn}<button class="btn primary" data-a="applychange">ثبت</button>`
  }
}
SHEETS.addRes = (s, b) => SHEETS.changeRes({ ...s, p: { pickUnit: true } }, b)
SHEETS.resMenu = (s, b) => {
  const p = personById(b, s.p.p)
  const u = unitById(b, s.p.u)
  const cur = occupantStay(b, u.id)
  return {
    title: p.name + ' · واحد ' + fa(u.no),
    body: `<div class="card flat">${
      p.phone
        ? `<a class="row" style="text-decoration:none;color:inherit" href="tel:${en(
            p.phone
          )}">${ico('phone')}<span class="t">تماس · ${esc(
            p.phone
          )}</span></a><a class="row" style="text-decoration:none;color:inherit" href="sms:${en(
            p.phone
          )}">${ico('msg')}<span class="t">پیامک</span></a>`
        : ''
    }
    <button class="row" data-a="go" data-to="${bhash(b, 'counterparties')}">${ico(
      'user'
    )}<span class="t">صفحهٔ طرف حساب</span></button>
    <button class="row" data-a="changeres" data-u="${u.id}">${ico(
      'users'
    )}<span class="t">تغییر ساکن</span></button>
    ${
      cur && cur.personId === p.id
        ? `<button class="row" data-a="exitres" data-u="${u.id}">${ico(
            'exit'
          )}<span class="t neg">خروج (واحد خالی شود)</span></button>`
        : ''
    }</div>`,
    foot: closeBtn
  }
}
