export function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsvValue).join(',')]

  for (const row of rows) {
    lines.push(row.map(cell => escapeCsvValue(String(cell ?? ''))).join(','))
  }

  return lines.join('\r\n')
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []

  let row: string[] = []

  let cell = ''

  let inQuotes = false

  const content = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]

    const next = content[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\r' && next === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i++
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv;charset=utf-8'
): void {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType })

  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function pickTextFile(accept = '.csv,text/csv'): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')

    input.type = 'file'
    input.accept = accept
    input.onchange = async () => {
      const file = input.files?.[0]

      if (!file) {
        resolve(null)

        return
      }
      resolve(await file.text())
    }
    input.click()
  })
}
