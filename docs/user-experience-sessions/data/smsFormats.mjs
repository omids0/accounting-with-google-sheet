// Bank SMS body makers. Amounts and balances are given in TOMAN and printed in RIAL (x10),
// like the real banks do; the template unit is therefore 'rial' and the app divides by 10.
import { fa, jalaliOf } from './lib.mjs'

const commas = n => Math.round(n).toLocaleString('en-US')
const two = n => String(n).padStart(2, '0')
const rial = toman => commas(toman * 10)

function parts(day, time) {
  const j = jalaliOf(day)

  return { yy: two(j.year % 100), mm: two(j.month), dd: two(j.day), j, time }
}

/** Bank Melli: «خرید/برداشت/واریز : مبلغ، از/به : حساب، مانده، yy/mm/dd_HH:MM», Persian digits. */
export function melli(verb, { toman, balance, acct, day, time }) {
  const p = parts(day, time)
  const prep = verb === 'واریز' ? 'به' : 'از'

  return fa(
    `بانک ملی ایران\n${verb}:${rial(toman)}\n${prep}:${acct}\nمانده:${rial(balance)}\n${p.yy}/${p.mm}/${p.dd}_${time}`
  )
}

/** Bank Mellat: «برداشت/واریز : مبلغ، حساب : 4567***1234، مانده، MMDD-HH:MM», ASCII digits. */
export function mellat(verb, { toman, balance, ref, day, time }) {
  const p = parts(day, time)

  return `بانک ملت\n${verb}:${rial(toman)}\nحساب:${ref}\nمانده:${rial(balance)}\n${p.mm}${p.dd}-${time}`
}

/** A Melli credit that also names the payer's card (used by the building fund). */
export function melliFromCard(verb, { toman, balance, acct, payerCard, day, time }) {
  const p = parts(day, time)

  return fa(
    `بانک ملی ایران\n${verb}:${rial(toman)}\nحساب:${acct}\nاز کارت:${payerCard}\nمانده:${rial(balance)}\n${p.yy}/${p.mm}/${p.dd}_${time}`
  )
}

/** Not a bank format the app has a template for: it must show up as «unknown». */
export function posNotice({ shop, toman, cardTail, day, time }) {
  const p = parts(day, time)

  return `تراکنش موفق\nخرید از پذیرنده ${shop}\nمبلغ ${rial(toman).replace(/,/g, '')} ریال\nکارت ***${cardTail}\n${p.j.year}/${two(p.j.month)}/${two(p.j.day)} ${time}`
}

export function pasargadStyle({ toman, balance, acct, day }) {
  const p = parts(day, '10:00')

  return `پاسارگاد\n+${rial(toman)}\nحساب ${acct}\nمانده ${rial(balance)}\n${p.j.year}/${two(p.j.month)}/${two(p.j.day)}`
}

export const promo = bank =>
  `${bank}\nمشتری گرامی، طرح جدید سپرده‌گذاری ویژه با سود بیشتر را از طریق همراه‌بانک و اینترنت‌بانک مشاهده کنید.`
