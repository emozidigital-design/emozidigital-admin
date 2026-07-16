// RFC-4180 CSV parser shared by the import API route and the import wizard.
// Handles quoted fields containing the delimiter or newlines, escaped quotes
// (""), and CRLF line endings — a plain line.split(delimiter) breaks fields
// like "16/07/2026, 06:41 pm" and shifts every following column.
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  const pushField = () => {
    row.push(field.trim())
    field = ""
  }
  const pushRow = () => {
    pushField()
    if (row.some(c => c !== "")) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"' && field.trim() === "") {
      inQuotes = true
      field = ""
    } else if (ch === delimiter) {
      pushField()
    } else if (ch === "\n") {
      pushRow()
    } else if (ch !== "\r") {
      field += ch
    }
  }
  if (field !== "" || inQuotes || row.length > 0) pushRow()

  return rows
}
