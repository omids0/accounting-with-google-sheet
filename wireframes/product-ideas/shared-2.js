// Approval card (idea د) and private tick (idea ج).
const $ = id => document.getElementById(id)

document.querySelectorAll('[data-a]').forEach(b =>
  b.addEventListener('click', () => {
    const ok = b.dataset.a === 'ok'

    $('st').textContent = ok ? 'تأیید شد' : 'رد شد'
    $('st').className = 'chip ' + (ok ? 'ok' : 'bad')
    $('lChip').textContent = ok ? 'تأیید شد' : 'رد شد'
    $('lChip').className = 'chip new ' + (ok ? 'ok' : 'bad')
    $('lNote').textContent = ok
      ? 'در مانده حساب شد (نصف‌نصف، سهم هر نفر ۶٬۰۰۰٬۰۰۰)'
      : 'در مانده حساب نمی‌شود'
    $('decided').textContent = 'تصمیم ثبت شد و در این نمونه تغییر نمی‌کند.'
    document.querySelectorAll('[data-a]').forEach(x => (x.disabled = true))
  })
)

$('priv').addEventListener('change', () => {
  const on = $('priv').checked

  $('pTitle').textContent = on ? 'خرج شخصی' : 'هدیهٔ تولد خواهر'
  $('pNote').textContent = on
    ? 'مادر پرداخت کرد، بدون عنوان و دسته'
    : 'مادر پرداخت کرد · دستهٔ هدیه'
  $('pChip').textContent = on ? 'خصوصی' : 'عمومی'
})
