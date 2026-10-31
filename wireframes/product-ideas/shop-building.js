// Check bounce sheet (idea ب): the debt line follows the "rebuild the debt" tick.
const rebuild = document.getElementById('rebuild')
const owe = document.getElementById('owe')

rebuild.addEventListener('change', () => {
  owe.textContent = rebuild.checked
    ? 'طلب او می‌شود ۲۶٬۰۰۰٬۰۰۰ (۱۴٬۰۰۰٬۰۰۰ + ۱۲٬۰۰۰٬۰۰۰) و از سقف ۱۵٬۰۰۰٬۰۰۰ بالاتر می‌رود'
    : 'طلب او ۱۴٬۰۰۰٬۰۰۰ می‌ماند و چک برگشتی فقط در گزارش چک‌ها دیده می‌شود'
  owe.className = rebuild.checked ? 'neg' : 'muted'
})
