export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/** Google treats addresses case-insensitively; an empty address never matches. */
export function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeEmail(a)

  return !!left && left === normalizeEmail(b)
}
