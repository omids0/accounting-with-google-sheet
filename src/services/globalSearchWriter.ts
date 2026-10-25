import { searchText, type SearchEntry } from './globalSearch'

/**
 * On a shared spreadsheet the writer's name joins the searchable text, so
 * «سارا» finds what Sara recorded; the row itself shows her avatar.
 */
export function withWriterNames(
  entries: SearchEntry[],
  writerName?: (email: string) => string
): SearchEntry[] {
  if (!writerName) return entries

  // A shared sheet has a few writers and thousands of rows: look each one up and normalize once.
  const nameTexts = new Map<string, string>()

  return entries.map(entry => {
    if (!entry.writer) return entry

    let nameText = nameTexts.get(entry.writer)

    if (nameText === undefined) {
      const name = writerName(entry.writer)

      nameText = name ? searchText(name) : ''
      nameTexts.set(entry.writer, nameText)
    }

    if (!nameText) return entry

    return { ...entry, text: `${entry.text} ${nameText}`.trim() }
  })
}
