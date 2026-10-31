// Debt planner demo for debt-goals.html: snowball vs avalanche simulation with ESTIMATED rates.
const D = [
  { n: 'وام', b: 73.95e6, p: 4.35e6, r: 0.22 },
  { n: 'لپ‌تاپ', b: 18.6e6, p: 3.1e6, r: 0 },
  { n: 'کارت اعتباری', b: 5.2e6, p: 8e5, r: 0.3 }
]
const M = 'فروردین اردیبهشت خرداد تیر مرداد شهریور مهر آبان آذر دی بهمن اسفند'.split(' ')
const fa = (n, o) => Math.round(n).toLocaleString('fa-IR', o)
const by = { snow: (a, b) => a.b - b.b, aval: (a, b) => b.r - a.r }
let mode = 'snow'
function sim(extra, roll) {
  const d = D.map(x => ({ ...x })),
    bars = []
  let t = 0
  while (d.some(x => x.b > 1) && bars.length < 120) {
    let pool = extra
    d.forEach(x => {
      const it = x.b > 1 ? (x.b * x.r) / 12 : 0,
        pay = Math.min(x.p, x.b + it)
      t += it
      x.b += it - pay
      pool += roll ? x.p - pay : 0
    })
    d.filter(x => x.b > 1)
      .sort(by[mode])
      .forEach(x => {
        const pay = Math.min(pool, x.b)
        x.b -= pay
        pool -= pay
      })
    bars.push(d.reduce((s, x) => s + x.b, 0))
  }
  return { i: bars.length, t, bars }
}
function render() {
  const ex = +rg.value,
    a = sim(0, false),
    c = sim(ex, true),
    end = 6 + c.i
  const out = {
    exv: fa(ex),
    po: M[end % 12] + ' ' + fa(1405 + Math.floor(end / 12), { useGrouping: false }),
    ti: fa(c.t) + ' تومان',
    sv: fa(a.t - c.t) + ' تومان',
    mo: fa(a.i - c.i) + ' ماه',
    or:
      'ترتیب پرداخت: ' +
      D.slice()
        .sort(by[mode])
        .map(x => x.n)
        .join(' ← '),
    st: c.bars.map(v => `<i style="height:${(v / c.bars[0]) * 100}%"></i>`).join('')
  }
  Object.entries(out).forEach(([k, v]) => (document.getElementById(k).innerHTML = v))
}
rg.addEventListener('input', render)
modes.addEventListener('click', e => {
  if (!e.target.dataset.m) return
  mode = e.target.dataset.m
  modes.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target))
  render()
})
render()
