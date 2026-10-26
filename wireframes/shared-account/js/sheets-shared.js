/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Sheets inside the shared account: the record sheet (SharedRecordSheet), «ثبت هزینه» / «ثبت
   درآمد» (SharedAddSheet) and «ثبت تسویه» (SharedSettleSheet, no wallet field). */
function recordSheet(id) {
  var r = rec(id)
  if (!r) return ''
  var settle = r.type === 'settle',
    inc = r.type === 'income',
    edit = canEdit(r)
  var sign = settle ? '' : inc ? '+' : '-'
  var rows = [['تاریخ', `${r.wd}، ${r.date}`]]
  if (settle) rows.push(['تسویه', `${nameIn(r.payer)} به ${nameIn(r.split.slice(5))}`])
  else rows.push(['دسته', r.cat])
  rows.push(['ثبت‌کننده', nameIn(r.creator)])
  if (!settle && !inc) rows.push(['پرداخت‌کننده', nameIn(r.payer)], ['تقسیم', splitLabel(r.split)])
  rows.push(['ایجادکننده', nameIn(r.creator)])
  var dl = rows
    .map(function (x) {
      return `<div><dt>${x[0]}</dt><dd>${x[1]}</dd></div>`
    })
    .join('')
  var body = `<b class="amt ${
    settle ? '' : inc ? 'inc' : 'exp'
  }" style="font-size:1.3rem">${sign}${money(r.amount)} تومان</b><dl class="dl">${dl}</dl>`
  if (edit) {
    body += moneyField('r-amount', 'ویرایش مبلغ', r.amount)
    body += btn('حذف', 'recDel', 'sec sm', `data-v="${r.id}"`)
  } else {
    body += alertBox(`${ic('lock', 16)} ${lockNote(r)}`)
  }
  var foot = edit
    ? btn('ذخیرهٔ مبلغ', 'recSave', '', `data-v="${r.id}" id="r-save" disabled`) +
      btn('بستن', 'close', 'sec')
    : btn('بستن', 'close', 'sec')
  return sheet(settle ? 'تسویه' : r.title, body, foot)
}
function addSheet() {
  var a = S.add,
    inc = a.type === 'income',
    other = otherOf(me())
  var cats = [['', 'انتخاب دسته‌بندی']].concat(inc ? INC_CATS : EXP_CATS)
  var body = `${field(
    'نوع ثبت',
    seg(
      'aType',
      [
        ['expense', 'هزینه'],
        ['income', 'درآمد']
      ],
      a.type,
      'نوع ثبت'
    )
  )}
    ${moneyField('a-amount', 'مبلغ (تومان)', a.amount, true)}
    ${field('عنوان', input('a-title', a.title, 'placeholder="مثلاً میوه و سبزی"'), {
      id: 'a-title'
    })}
    ${field('دسته', select('a-cat', cats, a.cat), { id: 'a-cat', req: true })}`
  if (!inc) {
    var payers = pair().map(function (e) {
      return [e, nameIn(e)]
    })
    var splits = [
      ['equal', 'نصف‌نصف'],
      ['only:' + me(), 'فقط من'],
      ['only:' + other, 'فقط ' + nameIn(other)]
    ]
    body += field('چه کسی پرداخت کرد؟', select('a-payer', payers, a.payer || me()))
    body += field('برای چه کسی است؟', seg('aSplit', splits, a.split, 'برای چه کسی است؟'))
    body += alertBox(`<span id="a-prev">${preview(a.amount, a.split, a.payer, nameIn)}</span>`)
  } else {
    body += alertBox('درآمد فقط در گزارش‌های حساب مشترک می‌آید و روی تراز اثری ندارد.')
  }
  body += field('تاریخ', input('a-date', '۴ آبان ۱۴۰۵'))
  if (a.err) body += `<p class="err" role="alert">${a.err}</p>`
  return sheet(
    inc ? 'ثبت درآمد' : 'ثبت هزینه',
    body,
    btn('ثبت', 'addSave', inc ? 'inc' : 'exp') + btn('انصراف', 'close', 'sec')
  )
}
function settleSheet() {
  var st = S.settleDraft,
    p = pair(),
    o = suggest()
  var dirs = p.map(function (e) {
    return [e, `${nameIn(e)} به ${nameIn(otherOf(e))}`]
  })
  var clears = o && o.from === st.from && o.amount === st.amount
  var body = `${field('چه کسی به چه کسی داد؟', select('s-dir', dirs, st.from))}
    ${moneyField('s-amount', 'مبلغ (تومان)', st.amount, true)}
    ${field('تاریخ', input('s-date', '۴ آبان ۱۴۰۵'))}
    ${alertBox(
      `این فقط یک ثبت است و پولی جابه‌جا نمی‌کند.${clears ? ' بعد از ثبت، تراز صفر می‌شود.' : ''}`
    )}`
  return sheet('ثبت تسویه', body, btn('تأیید تسویه', 'settleSave') + btn('انصراف', 'close', 'sec'))
}
