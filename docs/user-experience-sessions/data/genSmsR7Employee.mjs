// Fresh bank SMS for today (13 Aban 1405) for the round-7 quick-sheet audit. Balances follow the Melli chain.
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d])
const money = n => fa(n.toLocaleString('en-US'))
const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d }
const out = []
let melli = 689262500, mellat = 261500000
const push = (key, when, body) => out.push({ id: createHash('sha256').update(key + body).digest('hex'), sender: body.includes('ملت') ? 'BankMellat' : 'BMI', body, receivedAt: when.getTime(), source: 'live', _key: key })
const hm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const melliSms = (key, h, m, kind, amt, dup = false) => {
  const when = at(h, m)
  if (!dup) melli += kind === 'خرید' || kind === 'برداشت' ? -amt : amt
  const where = kind === 'واریز' ? 'به' : 'از'
  push(key, when, `بانک ملی ایران\n${kind}:${money(amt)}\n${where}:۰۱۰۵۵۵۱۲۳۴۰۰۲\nمانده:${money(melli)}\n${fa('05/08/13')}_${fa(hm(at(h, m - (dup ? 1 : 0))))}`)
}
const mellatDeposit = (key, h, m, amt) => { mellat += amt; push(key, at(h, m), `بانک ملت\nواریز:${amt.toLocaleString('en-US')}\nحساب:4567***1234\nمانده:${mellat.toLocaleString('en-US')}\n0813-${hm(at(h, m))}`) }
melliSms('S1-page-purchase', 6, 0, 'خرید', 1000000)
melliSms('S2-quick-purchase', 7, 0, 'خرید', 1000000)
melliSms('TA-out', 8, 0, 'برداشت', 5000000); mellatDeposit('TA-in', 8, 1, 5000000)
melliSms('TB-out', 9, 0, 'برداشت', 5000000); mellatDeposit('TB-in', 9, 1, 5000000)
melliSms('D1', 10, 0, 'خرید', 2380000); melliSms('D1dup', 10, 1, 'خرید', 2380000, true)
melliSms('D2', 11, 0, 'خرید', 3000000); melliSms('D2dup', 11, 1, 'خرید', 3000000, true)
melliSms('V1-page-vehicle', 11, 30, 'خرید', 1500000)
melliSms('V2-quick-vehicle', 12, 30, 'خرید', 1500000)
melliSms('R1-page-debt', 12, 40, 'خرید', 700000)
melliSms('R2-quick-debt', 12, 50, 'خرید', 700000)
melliSms('C1-page-recv', 12, 55, 'واریز', 800000)
melliSms('C2-quick-recv', 12, 58, 'واریز', 800000)
writeFileSync(new URL('./sms-r7-employee.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(out.map(o => `${o._key.padEnd(18)} ${o.id.slice(0, 10)} ${new Date(o.receivedAt).toTimeString().slice(0, 5)} ${o.body.replace(/\n/g, ' ')}`).join('\n'))
