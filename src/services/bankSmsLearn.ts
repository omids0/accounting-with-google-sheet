import type { SmsSlotRole, SmsTemplate, SmsTemplatePart } from '../types'

export type SmsRoleKeywords = [SmsSlotRole, string[]][]

/** Punctuation that sits between a label and its number: «مانده:», «مبلغ =». */
const LABEL_TAIL = /[\s:=\-+،,.]+$/

/** The word right before a slot, e.g. «مانده» in «… مانده:». */
export function labelWord(text: string): string {
  const words = text.replace(LABEL_TAIL, '').trim().split(' ')
  const word = words[words.length - 1] ?? ''

  return word.length >= 2 ? word : ''
}

/**
 * Labels the user confirmed in saved templates. They extend the built-in
 * keywords, so every saved or corrected template improves later guesses.
 */
export function learnedKeywords(templates: SmsTemplate[]): SmsRoleKeywords {
  const byRole = new Map<SmsSlotRole, Set<string>>()

  for (const template of templates) {
    template.parts.forEach((part, index) => {
      const before = template.parts[index - 1]

      if (part.kind !== 'slot' || part.role === 'ignore' || before?.kind !== 'text') return

      const word = labelWord(before.value)

      if (!word) return

      const words = byRole.get(part.role) ?? new Set<string>()

      words.add(word)
      byRole.set(part.role, words)
    })
  }

  return [...byRole.entries()].map(([role, words]) => [role, [...words]])
}

function sameShape(a: SmsTemplatePart[], b: SmsTemplatePart[]): boolean {
  if (a.length !== b.length) return false

  return a.every((part, index) => {
    const other = b[index]

    if (part.kind !== other.kind) return false

    return part.kind === 'slot' || part.value.trim() === (other as typeof part).value.trim()
  })
}

/** A saved template with exactly the same text skeleton as the new sample. */
export function findSameShapeTemplate(
  parts: SmsTemplatePart[],
  templates: SmsTemplate[]
): SmsTemplate | null {
  return templates.find(template => sameShape(parts, template.parts)) ?? null
}
