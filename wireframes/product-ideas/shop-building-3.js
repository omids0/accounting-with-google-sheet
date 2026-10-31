const base = [125, 120, 55, 50, 45, 40, 12, 7, 2, -27],
  fa = n => n.toLocaleString('fa-IR')
const $ = id => document.getElementById(id)
const draw = () => {
  const c = +$('chg').value,
    e = ((c - 2400000) * 12) / 1e6
  const v = base.map((b, i) => b + e * i),
    low = Math.min(...v),
    bad = low < 0
  $('line').setAttribute(
    'points',
    v.map((x, i) => `${289 - 31 * i},${Math.min(120, 95 - x * 0.6).toFixed(1)}`).join(' ')
  )
  $('note').innerHTML =
    '<span class="est">برآورد</span> ' +
    (bad
      ? `صندوق تا مرداد کم می‌آورد (کمبود حدود ${fa(Math.round(-low))} میلیون)`
      : `صندوق تا مرداد کم نمی‌آورد؛ کمترین مانده حدود ${fa(Math.round(low))} میلیون`)
  $('note').className = bad ? 'neg' : 'pos'
  $('val').textContent = fa(c)
}
$('chg').addEventListener('input', draw)
