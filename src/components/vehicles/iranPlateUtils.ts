import { normalizeDigits } from '../../utils/normalizeDigits'

export const IRAN_PLATE_LETTERS = [
  'الف',
  'ب',
  'پ',
  'ت',
  'ث',
  'ج',
  'د',
  'س',
  'ص',
  'ط',
  'ع',
  'ق',
  'ل',
  'م',
  'ن',
  'و',
  'ه',
  'ی'
] as const

export type IranPlateLetter = (typeof IRAN_PLATE_LETTERS)[number]

export type IranPlateParts = {
  province: string
  number: string
  letter: string
  serial: string
}

export type ParsedIranPlate = IranPlateParts & {
  legacy?: string
}

export const EMPTY_IRAN_PLATE: IranPlateParts = {
  province: '',
  number: '',
  letter: '',
  serial: ''
}

const PLATE_DELIMITER = '|'

function digitsOnly(value: string, maxLength: number): string {
  return normalizeDigits(value).replace(/\D/g, '').slice(0, maxLength)
}

export function sanitizeIranPlatePart(key: keyof IranPlateParts, value: string): string {
  if (key === 'letter') {
    const trimmed = value.trim()

    if (!trimmed) return ''

    const match = IRAN_PLATE_LETTERS.find(letter => letter === trimmed || trimmed.endsWith(letter))

    return match ?? trimmed.slice(0, 1)
  }

  const maxLength = key === 'number' ? 3 : 2

  return digitsOnly(value, maxLength)
}

export function serializeIranPlate(parts: IranPlateParts): string {
  const normalized: IranPlateParts = {
    province: sanitizeIranPlatePart('province', parts.province),
    number: sanitizeIranPlatePart('number', parts.number),
    letter: sanitizeIranPlatePart('letter', parts.letter),
    serial: sanitizeIranPlatePart('serial', parts.serial)
  }

  if (!normalized.province && !normalized.number && !normalized.letter && !normalized.serial) {
    return ''
  }

  return [normalized.serial, normalized.letter, normalized.number, normalized.province].join(
    PLATE_DELIMITER
  )
}

export function parseIranPlate(value: string): ParsedIranPlate {
  const trimmed = String(value ?? '').trim()

  if (!trimmed) return { ...EMPTY_IRAN_PLATE }

  if (trimmed.includes(PLATE_DELIMITER)) {
    const [serial = '', letter = '', number = '', province = ''] = trimmed.split(PLATE_DELIMITER)

    return {
      serial: sanitizeIranPlatePart('serial', serial),
      letter: sanitizeIranPlatePart('letter', letter),
      number: sanitizeIranPlatePart('number', number),
      province: sanitizeIranPlatePart('province', province)
    }
  }

  return { ...EMPTY_IRAN_PLATE, legacy: trimmed }
}

export function isStructuredIranPlate(value: string): boolean {
  return parseIranPlate(value).legacy == null && Boolean(value.trim())
}

export function formatIranPlateLabel(value: string): string {
  const parsed = parseIranPlate(value)

  if (parsed.legacy) return parsed.legacy

  const { serial, letter, number, province } = parsed

  if (!serial && !letter && !number && !province) return '—'

  return [serial, letter, number, 'ایران', province].filter(Boolean).join(' ')
}

export function isEmptyPlate(value: string): boolean {
  const parsed = parseIranPlate(value)

  if (parsed.legacy) return !parsed.legacy.trim()

  return !parsed.province && !parsed.number && !parsed.letter && !parsed.serial
}
