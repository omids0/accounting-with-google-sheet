import { useCallback, useRef, useState } from 'react'

export type SharedDeleteAnswer = 'both' | 'one'

/**
 * «حذف ثبت» of a personal record that has a copy in the shared account: from both, or from the
 * personal account only (the copy stays, unlinked). `ask` resolves null when the user backs out.
 */
export function useSharedDeleteChoice() {
  const [title, setTitle] = useState<string | null>(null)
  const resolver = useRef<((answer: SharedDeleteAnswer | null) => void) | null>(null)

  const ask = useCallback((recordTitle: string) => {
    resolver.current?.(null)

    return new Promise<SharedDeleteAnswer | null>(resolve => {
      resolver.current = resolve
      setTitle(recordTitle)
    })
  }, [])

  const onAnswer = (answer: SharedDeleteAnswer | null) => {
    resolver.current?.(answer)
    resolver.current = null
    setTitle(null)
  }

  return { ask, sheetProps: { open: title !== null, title: title ?? '', onAnswer } }
}
