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

  return entries.map(entry => {
    const name = entry.writer ? writerName(entry.writer) : ''

    if (!name) return entry

    return { ...entry, text: `${entry.text} ${searchText(name)}`.trim() }
  })
}
