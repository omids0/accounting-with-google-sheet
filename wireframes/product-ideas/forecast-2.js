;(() => {
  const S = 64581250,
    SAFE = 5e6,
    q = id => document.getElementById(id)
  const fa = n => Math.abs(Math.round(n)).toLocaleString('fa-IR')
  const money = n => (n < 0 ? 'کسری ' : '') + fa(n)
  const day = i => (i < 25 ? `${fa(6 + i)} آبان` : `${fa(i - 24)} آذر`)
  const ev = [
    [4, -3100000],
    [6, -4350000],
    [8, -22e6],
    [12, -800000],
    [16, -11531250],
    [19, 8e6],
    [25, 65e6],
    [29, -18e6]
  ]
  let b = S
  const bal = Array.from(
    { length: 30 },
    (_, i) => (b += ev.filter(e => e[0] === i).reduce((s, e) => s + e[1], 0) - 1e6)
  )
  const calc = () => {
    const A = +q('amt').value,
      m0 = Math.min(...bal),
      af = bal.map(v => v - A),
      m1 = Math.min(...af),
      neg = af.findIndex(v => v < 0)
    const k = bal.findIndex((_, k) => bal.slice(k).every(v => v - A >= 0))
    q('aOut').textContent = fa(A)
    document.querySelectorAll('.fAmt').forEach(x => (x.textContent = fa(A)))
    q('doIt').disabled = !A
    q('m0').textContent = `${money(m0)} تومان (${day(bal.indexOf(m0))})`
    q('m1').textContent = `${money(m1)} تومان (${day(af.indexOf(m1))})`
    const [cls, txt] = !A
      ? ['', 'مبلغی وارد نشده؛ چیزی برای سنجیدن نیست']
      : m1 < 0
      ? [
          'bad',
          `با این خرید از ${day(neg)} مانده منفی می‌شود؛ بدترین روز ${day(
            af.indexOf(m1)
          )} با ${money(m1)} تومان`
        ]
      : m1 < SAFE
      ? [
          'warn',
          `می‌توانی ولی کمترین مانده‌ات (${day(af.indexOf(m1))}) از حاشیهٔ امن ${fa(
            SAFE
          )} کمتر می‌شود`
        ]
      : ['ok', 'بخر؛ مانده‌ات بالای حاشیهٔ امن می‌ماند']
    q('verdict').className = 'v ' + cls
    q('verdict').textContent = txt
    q('tip').textContent =
      !A || m1 >= 0
        ? ''
        : k < 0
        ? 'در این ۳۰ روز روز امنی برای این مبلغ پیدا نشد.'
        : `پیشنهاد: خرید را از ${day(
            k
          )} به بعد انجام بده؛ از آن روز مانده‌ات پس از خرید هم منفی نمی‌شود (برآورد).`
  }
  q('amt').oninput = calc
  document.querySelectorAll('[data-v]').forEach(
    c =>
      (c.onclick = () => {
        q('amt').value = c.dataset.v
        calc()
      })
  )
  // One list of checks feeds the "today" phone and the weekly table: [week, name, amount]
  const OUT = [
    [0, 'چک تأمین‌کننده', 9e6],
    [1, 'چک آقای احمدی', 22e6],
    [2, 'چک فروشگاه نور', 11531250],
    [2, 'چک بیمه', 20e6],
    [3, 'چک مصالح', 14e6],
    [3, 'چک حمل', 10e6],
    [4, 'چک اجارهٔ مغازه', 18e6]
  ]
  const IN = [
    [0, 'چک آقای صدری', 4e6],
    [1, 'چک خانم نوری', 6.5e6],
    [2, 'چک آقای رضایی', 8e6],
    [3, 'چک آقای کاظمی', 5e6],
    [4, 'چک خانم فرجی', 9e6]
  ]
  const L = ['۶ تا ۱۲ آبان', '۱۳ تا ۱۹ آبان', '۲۰ تا ۲۶ آبان', '۲۷ آبان تا ۳ آذر', '۴ تا ۱۰ آذر']
  const sum = (list, n) => list.filter(c => c[0] === n).reduce((t, c) => t + c[2], 0)
  const rows = list =>
    list.map(c => `<div class="row"><span>${c[1]}</span><b>${fa(c[2])}</b></div>`).join('')
  q('todayOut').innerHTML = rows(OUT)
  q('todayIn').innerHTML = rows(IN)
  const weeks = () => {
    let r = S,
      first = -1
    q('weeks').innerHTML =
      L.map((l, n) => {
        const o = sum(OUT, n),
          inn = q('late').checked ? (n ? sum(IN, n - 1) : 0) : sum(IN, n)
        r += inn - o - (q('daily').checked ? 7e6 : 0)
        if (r < 0 && first < 0) first = n
        return `<div class="wk"><div class="row"><b>هفتهٔ <bdi>${fa(
          n + 1
        )}</bdi></b><span><bdi>${l}</bdi></span></div><div class="row"><small>چک پرداختی</small><small>${fa(
          o
        )}</small></div><div class="bar bad"><i style="width:${(o / 32e6) * 100}%"></i></div>
        <div class="row"><small>چک دریافتی</small><small>${fa(
          inn
        )}</small></div><div class="bar ok"><i style="width:${(inn / 32e6) * 100}%"></i></div>
        <div class="row"><span>مانده پایان هفته (برآورد)</span><b class="${
          r < 0 ? 'neg' : 'pos'
        }">${money(r)}</b></div></div>`
      }).join('') +
      (q('late').checked
        ? '<small class="muted">با تأخیر یک‌هفته‌ای، دریافتی هفتهٔ ۵ (۹٬۰۰۰٬۰۰۰) به بعد از ۱۰ آذر می‌رود و اینجا نیست.</small>'
        : '')
    q('alert').innerHTML =
      first < 0
        ? 'در این هفته‌ها منفی نمی‌شوی (برآورد)'
        : `از این هفته منفی می‌شود: هفتهٔ <bdi>${fa(first + 1)}</bdi> (<bdi>${L[first]}</bdi>)`
    q('alert').className = 'v ' + (first < 0 ? 'ok' : 'bad')
  }
  q('late').onchange = weeks
  q('daily').onchange = weeks
  calc()
  weeks()
})()
