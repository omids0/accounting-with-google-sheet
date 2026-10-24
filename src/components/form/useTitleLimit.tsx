import { useRef, useState, type ClipboardEvent } from 'react'

import {
  pasteExceedsTitleLimit,
  titleCounterText,
  TITLE_MAX_LENGTH,
  TITLE_TOO_LONG_HINT
} from '../../utils/titleLimit'

/**
 * The 200-character cap of the `title` field: `maxLength` for typing and pasting, a «۱۸۶ / ۲۰۰»
 * counter after 150, and a one-time «عنوان حداکثر ۲۰۰ نویسه است» when a paste was cut.
 * A longer title that is already saved still loads and can be edited down.
 */
export function useTitleLimit(value: string) {
  const [cutByPaste, setCutByPaste] = useState(false)
  const told = useRef(false)
  const counter = titleCounterText(value.length)

  const inputProps = {
    maxLength: TITLE_MAX_LENGTH,
    onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const selected = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0)
      const pasted = event.clipboardData.getData('text').length

      if (told.current || !pasteExceedsTitleLimit(input.value.length, selected, pasted)) return

      told.current = true
      setCutByPaste(true)
    },
    onBlur: () => setCutByPaste(false)
  }

  const hint =
    cutByPaste || counter ? (
      <span className="flex justify-between gap-2">
        <span role="status">{cutByPaste ? TITLE_TOO_LONG_HINT : null}</span>
        <span>{counter}</span>
      </span>
    ) : undefined

  return { inputProps, hint }
}
