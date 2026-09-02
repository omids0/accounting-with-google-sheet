const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']

const TENS = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']

const TEENS = [
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده'
]

const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']

const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون']

function threeDigitsToWords(n: number): string {
  const parts: string[] = []

  const h = Math.floor(n / 100)

  const remainder = n % 100

  const t = Math.floor(remainder / 10)

  const o = remainder % 10

  if (h) parts.push(HUNDREDS[h])
  if (t === 1) {
    parts.push(TEENS[o])
  } else {
    if (t) parts.push(TENS[t])
    if (o) parts.push(ONES[o])
  }

  return parts.join(' و ')
}

export function numberToPersianWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  if (n === 0) return 'صفر'

  const groups: number[] = []

  let num = Math.floor(n)

  while (num > 0) {
    groups.push(num % 1000)
    num = Math.floor(num / 1000)
  }

  const words = groups
    .map((group, index) => {
      if (!group) return ''

      const part = threeDigitsToWords(group)

      return index ? `${part} ${SCALES[index]}` : part
    })
    .filter(Boolean)

  return words.reverse().join(' و ')
}
