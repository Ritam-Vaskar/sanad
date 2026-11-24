export function downloadTextFile(filename: string, contents: string, contentType: string) {
  const blob = new Blob([contents], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function downloadJsonFile(filename: string, value: unknown) {
  downloadTextFile(filename, `${JSON.stringify(value, null, 2)}\n`, 'application/json;charset=utf-8')
}

export function downloadCsvFile(filename: string, rows: Record<string, string | number | boolean>[]) {
  if (!rows.length) throw new Error('There is no data to export.')
  const columns = Object.keys(rows[0])
  const escape = (value: string | number | boolean) => `"${String(value).replaceAll('"', '""')}"`
  const contents = [columns.map(escape).join(','), ...rows.map((row) => columns.map((column) => escape(row[column] ?? '')).join(','))].join('\r\n')
  downloadTextFile(filename, `${contents}\r\n`, 'text/csv;charset=utf-8')
}
