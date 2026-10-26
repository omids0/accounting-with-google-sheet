/* eslint-disable -- prototype scripts share globals, not part of the app source */
function famHeader(title) {
  return appbar(
    '<button class="chip" data-act="spaces" style="display:inline-flex;gap:4px;align-items:center">' +
      S.wiz.name +
      ic('down', 14) +
      '</button>',
    {}
  )
}

function home() {
  var n = net(),
    p = paid(),
    tot = p.A + p.B,
    d = n.A,
    who = d >= 0 ? 'B' : 'A',
    to = d >= 0 ? 'A' : 'B',
    amt = Math.abs(d)
  var h = famHeader() + '<div class="pad">' + notices()
  if (me().role === 'viewer')
    h +=
      '<div class="notice info">' +
      ic('lock', 18) +
      '<span>شما ناظر هستید و فقط می‌بینید.</span></div>'
  if (
    S.members.some(function (m) {
      return m.st === 'invited'
    })
  )
    h +=
      '<div class="notice"><span>' +
      S.members
        .filter(function (m) {
          return m.st === 'invited'
        })
        .map(function (m) {
          return m.name
        })
        .join('، ') +
      ' هنوز دعوت را باز نکرده است.</span></div>'
  h +=
    '<div class="card bal"><p>تراز تا امروز</p><div class="big num">' +
    (amt < 1 ? 'حساب شما صاف است' : fmt(amt) + ' تومان') +
    '</div>' +
    (amt < 1
      ? ''
      : '<p>' +
        nm(who) +
        (who === S.as ? ' بدهکار ' : ' بدهکار ') +
        'به ' +
        nm(to) +
        (who === S.as ? ' هستید' : ' است') +
        '</p>') +
    (can('settle') && amt >= 1
      ? '<button class="btn" style="background:var(--primary-ink);color:var(--primary);align-self:flex-start" data-act="settle">ثبت تسویه</button>'
      : '') +
    '</div>'
  h +=
    '<div class="card"><div class="row"><h3 class="grow">هزینهٔ آبان</h3><b class="num">' +
    fmt(tot) +
    ' تومان</b></div>' +
    '<div class="bar"><i style="width:' +
    (p.A / tot) * 100 +
    '%;background:var(--pa)"></i><i style="width:' +
    (p.B / tot) * 100 +
    '%;background:var(--pb)"></i></div>' +
    '<div class="row small"><span class="av sm A">ن</span><span class="grow">' +
    nm('A') +
    ' پرداخته: <b class="num">' +
    fmt(p.A) +
    '</b></span></div>' +
    '<div class="row small"><span class="av sm B">م</span><span class="grow">' +
    nm('B') +
    ' پرداخته: <b class="num">' +
    fmt(p.B) +
    '</b></span></div></div>'
  h +=
    '<div class="card"><div class="row"><h3 class="grow">آخرین ثبت‌ها</h3><button class="chip" data-act="tab" data-v="tx">همه</button></div><div class="list">' +
    S.txs
      .slice()
      .sort(function (a, b) {
        return b.id - a.id
      })
      .slice(0, 3)
      .map(txRow)
      .join('') +
    '</div></div>'
  return h + '</div>'
}

function txRow(t) {
  return (
    '<button class="item" data-act="tx" data-id="' +
    t.id +
    '"><span class="av sm ' +
    t.by +
    '">' +
    mem(t.by).name[0] +
    '</span><span class="grow"><b>' +
    t.t +
    '</b><br><span class="small muted">' +
    t.cat +
    ' · ' +
    spLabel(t) +
    ' · ' +
    t.d +
    '</span></span><span class="amt num">' +
    fmt(t.a) +
    '</span></button>'
  )
}

function txs() {
  var f = S.filter,
    list = S.txs
      .slice()
      .sort(function (a, b) {
        return b.id - a.id
      })
      .filter(function (t) {
        return f === 'all' || t.by === f
      })
  var h =
    famHeader() +
    '<div class="pad"><div class="chips">' +
    [
      ['all', 'همه'],
      ['A', nm('A')],
      ['B', nm('B')]
    ]
      .map(function (c) {
        return (
          '<button class="chip" data-act="filter" data-v="' +
          c[0] +
          '" aria-pressed="' +
          (f === c[0]) +
          '">' +
          c[1] +
          '</button>'
        )
      })
      .join('') +
    '</div>' +
    '<div class="card"><div class="list">' +
    (list.length ? list.map(txRow).join('') : '<p>ثبتی پیدا نشد.</p>') +
    '</div></div></div>'
  return h
}

function settle() {
  var n = net(),
    amt = Math.abs(n.A),
    who = n.A >= 0 ? 'B' : 'A',
    to = n.A >= 0 ? 'A' : 'B'
  var h =
    famHeader() +
    '<div class="pad"><div class="card"><h3>وضع فعلی</h3><div class="num" style="font-size:1.3rem;font-weight:700">' +
    (amt < 1 ? 'صاف است' : fmt(amt) + ' تومان') +
    '</div>' +
    (amt < 1
      ? ''
      : '<p>' +
        nm(who) +
        ' به ' +
        nm(to) +
        ' بدهکار ' +
        (who === S.as ? 'هستید' : 'است') +
        '</p>') +
    (can('settle')
      ? '<button class="btn block" data-act="settle"' +
        (amt < 1 ? ' disabled' : '') +
        '>ثبت تسویه</button>'
      : '<p class="small">ثبت تسویه با دسترسی «ثبت تسویه» ممکن است.</p>') +
    '</div>' +
    '<div class="card"><h3>تسویه‌های قبلی</h3><div class="list">' +
    (S.sets.length
      ? S.sets
          .slice()
          .reverse()
          .map(function (s) {
            return (
              '<div class="item"><span class="grow">' +
              nm(s.from) +
              ' به ' +
              nm(s.to) +
              '<br><span class="small muted">' +
              s.d +
              '</span></span><b class="num">' +
              fmt(s.a) +
              '</b></div>'
            )
          })
          .join('')
      : '<p>هنوز تسویه‌ای نشده.</p>') +
    '</div></div></div>'
  return h
}

function members() {
  var m0 = me(),
    h =
      famHeader() +
      '<div class="pad">' +
      '<div class="card"><div class="row"><span class="av ' +
      m0.id +
      '">' +
      m0.name[0] +
      '</span><div class="grow"><h3>نقش شما: ' +
      ROLE[m0.role] +
      '</h3><p>' +
      ROLE_HINT[m0.role] +
      '</p></div></div></div>' +
      '<div class="card"><div class="row"><h3 class="grow">اعضا</h3>' +
      (can('members') ? '<button class="chip" data-act="inv">+ دعوت</button>' : '') +
      '</div><div class="list">' +
      S.members
        .map(function (m) {
          return (
            '<button class="item" data-act="member" data-id="' +
            m.id +
            '"><span class="av ' +
            m.id +
            '">' +
            m.name[0] +
            '</span><span class="grow"><b>' +
            m.name +
            (m.id === S.as ? ' (شما)' : '') +
            '</b><br><span class="small muted">' +
            ROLE[m.role] +
            (custom(m) ? ' · سفارشی' : '') +
            '</span></span>' +
            (m.st === 'invited'
              ? '<span class="pill warn">دعوت‌شده</span>'
              : '<span class="pill good">فعال</span>') +
            '</button>'
          )
        })
        .join('') +
      '</div></div>'
  h +=
    '<div class="card"><h3>ایمنی داده</h3><p>فایل در درایو ' +
    nm('A') +
    ' است. اگر مالک فایل را پاک کند، همه دسترسی را از دست می‌دهند.</p>' +
    '<div class="row"><span class="grow small">نسخهٔ پشتیبان ماهانه در درایو شریک</span><button class="sw" role="switch" data-act="backup" aria-checked="' +
    S.backup +
    '" aria-label="نسخهٔ پشتیبان ماهانه در درایو شریک"' +
    (can('export') ? '' : ' disabled') +
    '></button></div></div>'
  if (m0.role !== 'owner')
    h += '<button class="btn danger block" data-act="leaveSheet">ترک این فضا</button>'
  return h + '</div>'
}
