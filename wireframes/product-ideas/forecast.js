;(() => {
  const S = 64581250,
    SAFE = 5e6,
    q = id => document.getElementById(id)
  const fa = n => Math.abs(Math.round(n)).toLocaleString('fa-IR')
  const money = n => (n < 0 ? 'کسری ' : '') + fa(n)
  const out = n => '<bdi dir="ltr">−' + fa(n) + '</bdi>'
  const flow = n => (n < 0 ? out(n) : '<bdi dir="ltr">+' + fa(n) + '</bdi>')
  const state = v => (v < 0 ? 'کسری' : v < SAFE ? 'کمتر از حاشیهٔ امن' : 'کافی')
  const date = i => (i < 25 ? [6 + i, 'آبان'] : i < 55 ? [i - 24, 'آذر'] : [i - 54, 'دی'])
  const ev = [
    [4, -3100000, 'قسط لپ‌تاپ', 'سررسید'],
    [6, -4350000, 'قسط وام', 'سررسید'],
    [8, -22000000, 'چک آقای احمدی', 'چک'],
    [12, -800000, 'قبض برق', 'قبض'],
    [16, -11531250, 'چک فروشگاه نور', 'چک'],
    [19, 8e6, 'چک دریافتی آقای رضایی', 'چک'],
    [25, 65e6, 'حقوق', 'تکرار'],
    [29, -18e6, 'اجارهٔ خانه', 'تکرار'],
    [34, -3100000, 'قسط لپ‌تاپ', 'سررسید'],
    [36, -4350000, 'قسط وام', 'سررسید'],
    [55, 65e6, 'حقوق', 'تکرار'],
    [59, -18e6, 'اجارهٔ خانه', 'تکرار']
  ]
  let D = 1e6,
    N = 30,
    sel = 18,
    bal = []
  const model = () => {
    let b = S
    return Array.from(
      { length: 60 },
      (_, i) => (b += ev.filter(e => e[0] === i).reduce((s, e) => s + e[1], 0) - D)
    )
  }
  const y = v => 100 - ((v + 10e6) / 76e6) * 100
  const day = i => `${fa(date(i)[0])} ${date(i)[1]}`
  const list = () => {
    const items = ev.filter(e => e[0] === sel)
    q('dayList').innerHTML =
      `<h3>روز ${day(sel)} · مانده برآوردی ${money(bal[sel])}</h3>` +
      (items
        .map(
          e =>
            `<div class="row"><span><span class="chip ${e[1] < 0 ? 'bad' : 'ok'}">${e[3]}</span> ${
              e[2]
            }</span><b>${flow(e[1])}</b></div>`
        )
        .join('') ||
        '<small class="muted">سررسیدی نیست؛ فقط خرج روزانهٔ برآوردی کم می‌شود.</small>')
  }
  const draw = () => {
    bal = model()
    const w = bal.slice(0, 25),
      m = Math.min(...w),
      mi = w.indexOf(m)
    q('line').setAttribute(
      'points',
      w.map((v, i) => `${300 - i * 12.5},${y(v).toFixed(1)}`).join(' ')
    )
    q('minDot').setAttribute('cx', 300 - mi * 12.5)
    q('minDot').setAttribute('cy', y(m))
    q('minTxt').textContent = `پایین‌ترین روز (برآورد): ${day(mi)}؛ ${money(m)} تومان`
    q('endTxt').textContent = `حدود ${money(w[24])} تومان`
    q('endTxt').className = 'num ' + (w[24] < 0 ? 'neg' : 'pos')
    q('dOut').textContent = fa(D)
    q('cal').innerHTML =
      Array.from('شیدسچپج')
        .map(c => `<b>${c}</b>`)
        .join('') +
      '<i></i>'.repeat(4) +
      bal
        .slice(0, N)
        .map(
          (v, i) =>
            `<button data-i="${i}" aria-label="${day(i)}: ${state(v)}، مانده برآوردی ${money(
              v
            )} تومان${ev.some(e => e[0] === i) ? '، سررسید دارد' : ''}" ${
              date(i)[0] === 1 || !i ? `data-m="${date(i)[1]}"` : ''
            } class="d ${v < 0 ? 'r' : v < SAFE ? 'o' : 'g'}${
              ev.some(e => e[0] === i) ? ' e' : ''
            }${i === sel ? ' sel' : ''}">${fa(date(i)[0])}</button>`
        )
        .join('')
    list()
  }
  q('spend').oninput = e => {
    D = +e.target.value
    draw()
  }
  q('cal').onclick = e => {
    if (e.target.dataset.i) {
      sel = +e.target.dataset.i
      draw()
    }
  }
  document.querySelectorAll('[data-n]').forEach(
    b =>
      (b.onclick = () => {
        N = +b.dataset.n
        if (sel >= N) sel = N - 1
        document.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b))
        draw()
      })
  )
  draw()
})()
