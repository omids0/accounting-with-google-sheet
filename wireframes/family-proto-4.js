/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* ---------- sheets ---------- */
function sheetWrap(title, body) {
  return (
    '<div class="scrim" data-act="close"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="' +
    title +
    '"><div class="grab"></div><header class="sh-h"><h3>' +
    title +
    '</h3><button class="icon" data-act="close" aria-label="بستن">' +
    ic('x') +
    '</button></header><div class="sh-b">' +
    body +
    '</div></section>'
  )
}

function sheetHTML() {
  var s = S.sheet
  if (!s) return ''
  if (s.k === 'add') return addSheet()
  if (s.k === 'tx') return txSheet(s.id)
  if (s.k === 'settle') return settleSheet()
  if (s.k === 'member') return memberSheet(s.id)
  if (s.k === 'inv') return invSheet()
  if (s.k === 'off') return offSheet()
  if (s.k === 'pdel') return pdelSheet(s.id)
  if (s.k === 'notice') return noticeSheet(s.id)
  if (s.k === 'leave')
    return sheetWrap(
      'ترک این فضا',
      '<p>دسترسی شما به فایل حساب مشترک در درایو برداشته می‌شود. حساب شخصی شما دست‌نخورده می‌ماند و ثبت‌های شما برای بقیه می‌ماند.</p><button class="btn danger block" data-act="leave">ترک فضا</button><button class="btn ghost block" data-act="close">انصراف</button>'
    )
  return ''
}

function addSheet() {
  var d = S.draft,
    ppl = ['A', 'B']
  return sheetWrap(
    'ثبت هزینه',
    '<div class="field"><label for="d-amount">مبلغ (تومان)</label><input id="d-amount" inputmode="numeric" value="' +
      (d.a ? fmt(d.a) : '') +
      '" placeholder="مثلاً ۸۵۰٬۰۰۰"></div>' +
      '<div class="field"><label for="d-title">بابت</label><input id="d-title" value="' +
      d.t +
      '" placeholder="مثلاً میوه و سبزی"></div>' +
      '<div class="field"><label for="d-cat">دسته</label><select id="d-cat">' +
      CATS.map(function (c) {
        return '<option' + (c === d.cat ? ' selected' : '') + '>' + c + '</option>'
      }).join('') +
      '</select></div>' +
      '<div class="field"><label>چه کسی پرداخت کرد؟</label><div class="seg">' +
      ppl
        .map(function (p) {
          return (
            '<button data-act="dby" data-v="' +
            p +
            '" aria-pressed="' +
            (d.by === p) +
            '">' +
            nm(p) +
            '</button>'
          )
        })
        .join('') +
      '</div></div>' +
      '<div class="field"><label>برای چه کسی است؟</label><div class="seg"><button data-act="dsp" data-v="equal" aria-pressed="' +
      (d.sp === 'equal') +
      '">نصف‌نصف</button>' +
      ppl
        .map(function (p) {
          return (
            '<button data-act="dsp" data-v="' +
            p +
            '" aria-pressed="' +
            (d.sp === p) +
            '">فقط ' +
            nm(p) +
            '</button>'
          )
        })
        .join('') +
      '</div></div>' +
      '<div class="notice info"><span id="d-prev">' +
      prev(d) +
      '</span></div>' +
      '<button class="btn block" data-act="save">ثبت</button>'
  )
}
function prev(d) {
  if (!d.a) return 'مبلغ را وارد کنید تا سهم هر نفر را ببینید.'
  var a = d.sp === 'equal' ? d.a / 2 : d.sp === 'A' ? d.a : 0,
    b = d.sp === 'equal' ? d.a / 2 : d.sp === 'B' ? d.a : 0
  return 'سهم ' + nm('A') + ': ' + fmt(a) + ' · سهم ' + nm('B') + ': ' + fmt(b)
}

function txSheet(id) {
  var t = S.txs.filter(function (x) {
    return x.id === id
  })[0]
  if (!t) return ''
  var own = t.by === S.as,
    ok = can('record') && (own || can('editOthers'))
  return sheetWrap(
    t.t,
    '<div class="card"><div class="row"><span>مبلغ</span><b class="grow num" style="text-align:end">' +
      fmt(t.a) +
      ' تومان</b></div><div class="row"><span>پرداخت‌کننده</span><b class="grow" style="text-align:end">' +
      nm(t.by) +
      '</b></div><div class="row"><span>تقسیم</span><b class="grow" style="text-align:end">' +
      spLabel(t) +
      '</b></div><div class="row"><span>دسته</span><b class="grow" style="text-align:end">' +
      t.cat +
      '</b></div></div>' +
      (ok
        ? txEdit(t)
        : '<div class="notice">' +
          ic('lock', 18) +
          '<span>' +
          (!can('record')
            ? 'ناظر نمی‌تواند ثبت‌ها را تغییر بدهد.'
            : 'این ثبت را ' +
              nm(t.by) +
              ' انجام داده و شما دسترسی «ویرایش ثبت‌های دیگران» ندارید.') +
          '</span></div>')
  )
}

function settleSheet() {
  var n = net(),
    amt = Math.abs(n.A),
    who = n.A >= 0 ? 'B' : 'A',
    to = n.A >= 0 ? 'A' : 'B'
  return sheetWrap(
    'ثبت تسویه',
    '<div class="card"><p>' +
      nm(who) +
      ' به ' +
      nm(to) +
      '</p><div class="num" style="font-size:1.4rem;font-weight:700">' +
      fmt(amt) +
      ' تومان</div></div><p class="small muted">این فقط یک ثبت است و پولی جابه‌جا نمی‌کند. بعد از ثبت، تراز صفر می‌شود.</p><button class="btn block" data-act="doSettle">تأیید تسویه</button>'
  )
}

function memberSheet(id) {
  var m = mem(id)
  if (!m) return ''
  var edit = can('members') && m.role !== 'owner' && m.id !== S.as
  var h =
    '<div class="row"><span class="av ' +
    m.id +
    '">' +
    m.name[0] +
    '</span><div class="grow"><b>' +
    m.name +
    '</b><br><span class="small muted" dir="ltr" style="display:block;text-align:end">' +
    m.email +
    '</span></div>' +
    (m.st === 'invited'
      ? '<span class="pill warn">دعوت‌شده</span>'
      : '<span class="pill good">فعال</span>') +
    '</div>'
  if (m.role === 'owner')
    h +=
      '<div class="notice info"><span>مالک فایل است. نقش و دسترسی مالک تغییر نمی‌کند.</span></div>'
  else if (m.id === S.as && can('members'))
    h +=
      '<div class="notice"><span>نقش و دسترسی خودتان را نمی‌توانید عوض کنید؛ مالک باید این کار را بکند.</span></div>'
  if (edit)
    h +=
      '<div class="field"><label>نقش</label><div class="seg"><button data-act="mrole" data-id="' +
      id +
      '" data-v="partner" aria-pressed="' +
      (m.role === 'partner') +
      '">شریک</button><button data-act="mrole" data-id="' +
      id +
      '" data-v="viewer" aria-pressed="' +
      (m.role === 'viewer') +
      '">ناظر</button></div><span class="small muted">' +
      ROLE_HINT[m.role] +
      '</span></div>'
  h +=
    '<div class="card"><div class="row"><h3 class="grow">چه کارهایی می‌کند</h3>' +
    (custom(m) ? '<span class="pill warn">سفارشی</span>' : '') +
    '</div>' +
    PERMS.map(function (p) {
      var on = can(p[0], m),
        ov = m.ov[p[0]] !== undefined
      return (
        '<div class="perm"><span class="grow">' +
        (ov ? '<i class="dot"></i> ' : '') +
        p[1] +
        '</span><button class="sw" role="switch" data-act="mperm" data-id="' +
        id +
        '" data-p="' +
        p[0] +
        '" aria-checked="' +
        on +
        '" aria-label="' +
        p[1] +
        '"' +
        (edit ? '' : ' disabled') +
        '></button></div>'
      )
    }).join('') +
    '<p class="small muted">دسترسی در گوگل‌درایو: <b>' +
    (driveWrite(m) ? 'ویرایش' : 'فقط مشاهده') +
    '</b>' +
    (m.role === 'viewer' && driveWrite(m)
      ? ' (چون کار نوشتن به او داده شده، درایو هم به «ویرایش» بالا می‌رود)'
      : '') +
    '</p></div>'
  if (edit) {
    h +=
      m.st === 'invited'
        ? '<button class="btn ghost block" data-act="resend" data-id="' +
          id +
          '">ارسال دوبارهٔ دعوت</button>'
        : ''
    h += '<button class="btn danger block" data-act="rm" data-id="' + id + '">قطع دسترسی</button>'
  }
  return sheetWrap(m.name, h)
}

function invSheet() {
  var v = S.inv
  return sheetWrap(
    'دعوت عضو',
    '<div class="field"><label for="i-email">ایمیل حساب گوگل</label><input id="i-email" dir="ltr" inputmode="email" value="' +
      v.email +
      '" placeholder="name@gmail.com"></div>' +
      '<div class="field"><label>نقش</label><div class="seg"><button data-act="irole" data-v="partner" aria-pressed="' +
      (v.role === 'partner') +
      '">شریک</button><button data-act="irole" data-v="viewer" aria-pressed="' +
      (v.role === 'viewer') +
      '">ناظر</button></div><span class="small muted">' +
      ROLE_HINT[v.role] +
      '</span></div>' +
      (v.err ? '<div class="err" id="i-err">' + v.err + '</div>' : '') +
      '<button class="btn block" data-act="sendInv">ارسال دعوت</button>'
  )
}
