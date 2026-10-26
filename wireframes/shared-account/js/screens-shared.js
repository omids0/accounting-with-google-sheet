/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Inside the shared account: «خانه», «ثبت‌ها» and «تسویه» (SharedHomePage, SharedRecordsPage,
   SharedSettlePage). The bottom bar is the account's own four tabs. */
function viewerBanner() {
  if (myRole() !== 'viewer') return ''
  return `<div class="card guide" role="status"><span class="ico">${ic(
    'lock',
    20
  )}</span><b>شما ناظر هستید و فقط می‌بینید</b></div>`
}
function txRow(r) {
  var inc = r.type === 'income',
    who = inc ? r.creator : r.payer
  var meta = [r.cat, inc ? 'درآمد' : splitLabel(r.split), r.date].join(' · ')
  return `<button type="button" class="tx" data-act="rec" data-v="${r.id}" aria-label="جزئیات ${
    r.title
  }"><span class="grow"><b>${r.title}</b><br /><span class="meta row" style="gap:6px">${avatar(
    who,
    'sm'
  )}<span>${meta}</span></span></span><span class="amt ${inc ? 'inc' : 'exp'}">${
    inc ? '+' : '-'
  }${money(r.amount)} تومان</span></button>`
}
function listOf(filter) {
  return S.records.filter(function (r) {
    if (r.type === 'settle') return false
    if (filter === 'all') return true
    return (r.type === 'income' ? r.creator : r.payer) === filter
  })
}
function heroCard() {
  var o = suggest()
  var amount = o
    ? `<div class="big">${money(o.amount)}</div><div class="sm" style="font-weight:700">تومان</div>`
    : ''
  var settle = o && can('settle') ? btn('ثبت تسویه', 'settleSheet', 'sec sm') : ''
  return `<div class="card hero"><div class="lbl">تراز تا امروز</div>${amount}<div class="head">${headline()}</div>${settle}</div>`
}
function monthCard() {
  var t = monthTotals(),
    p = pair()
  var first = p.indexOf(me()) >= 0 ? me() : p[0],
    second = otherOf(first)
  var pct = t.total ? Math.round((t[first] / t.total) * 100) : 0
  var line = function (e, color) {
    var label = e === me() ? 'شما پرداخته‌اید' : `${nameIn(e)} پرداخته`
    return `<div class="row"><span class="dot" style="background:${color}"></span><span class="grow">${label}</span><b>${money(
      t[e]
    )} تومان</b></div>`
  }
  return `<div class="card"><div class="row"><h3 class="grow">هزینهٔ آبان</h3><b>${money(
    t.total
  )} تومان</b></div>
    <div class="bar" role="img" aria-label="سهم پرداخت هر نفر"><i style="width:${pct}%;background:var(--primary)"></i><i style="width:${
    100 - pct
  }%;background:var(--other)"></i></div>
    ${line(first, 'var(--primary)')}${line(second, 'var(--other)')}</div>`
}
function home() {
  var last = listOf('all').slice(0, 3).map(txRow).join('')
  return `${header('خانه')}<div class="page">${viewerBanner()}${noticeCards(
    nameIn
  )}${heroCard()}${monthCard()}
    <div class="card"><div class="row"><h3 class="grow">آخرین ثبت‌ها</h3>${btn(
      'همه',
      'go',
      'sec sm',
      'data-v="records"'
    )}</div>${last || '<p class="meta">هنوز ثبتی نیست.</p>'}</div></div>`
}
function records() {
  var p = pair().indexOf(me()) >= 0 ? [me(), otherOf(me())] : pair()
  var chips = [['all', 'همه']].concat(
    p.map(function (e) {
      return [e, nameIn(e)]
    })
  )
  var chipRow = chips
    .map(function (c) {
      return `<button type="button" class="chip" data-act="filter" data-v="${
        c[0]
      }" aria-pressed="${S.filter === c[0]}">${c[1]}</button>`
    })
    .join('')
  var list = listOf(S.filter).map(txRow).join('')
  return `${header(
    'ثبت‌ها'
  )}<div class="page">${viewerBanner()}<div class="chips" role="group" aria-label="ثبت‌های چه کسی">${chipRow}</div>
    <div class="card" style="gap:8px">${list || '<p class="meta">ثبتی پیدا نشد</p>'}</div></div>`
}
function settlePage() {
  var o = suggest()
  var history = S.records
    .filter(function (r) {
      return r.type === 'settle'
    })
    .map(function (r) {
      return `<button type="button" class="tx" data-act="rec" data-v="${
        r.id
      }" aria-label="جزئیات تسویهٔ ${r.title}"><span class="grow"><b>${nameIn(r.payer)} به ${nameIn(r.split.slice(5))}</b><br /><span class="meta">${r.date}</span></span><span class="amt">${money(r.amount)} تومان</span></button>`
    })
    .join('')
  var action = can('settle')
    ? o
      ? btn('ثبت تسویه', 'settleSheet', 'block')
      : ''
    : '<p class="meta">ثبت تسویه با دسترسی «ثبت تسویه» ممکن است.</p>'
  return `${header('تسویه')}<div class="page">${viewerBanner()}
    <div class="card"><h3>وضع فعلی</h3>${
      o ? `<b style="font-size:1.5rem">${money(o.amount)} تومان</b>` : ''
    }<b style="font-size:1.05rem">${headline()}</b>${action}</div>
    <div class="card"><h3>تسویه‌های قبلی</h3>${
      history || '<p class="meta">هنوز تسویه‌ای نشده.</p>'
    }</div></div>`
}
