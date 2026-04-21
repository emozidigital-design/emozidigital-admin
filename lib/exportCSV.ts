import * as XLSX from 'xlsx'

// ─── Single-sheet CSV (used by client LIST export) ────────────────────────────

function escapeCell(val: unknown): string {
  if (val == null) return ''
  const s = typeof val === 'object' ? JSON.stringify(val) : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => escapeCell(row[h])).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Multi-sheet XLSX (used by client DETAIL export) ─────────────────────────

export type ExportSheet = {
  name: string
  rows: Record<string, string>[]
}

export function exportToXLSX(sheets: ExportSheet[], filename: string) {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue
    const ws = XLSX.utils.json_to_sheet(sheet.rows)

    // Bold the header row
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (!ws[addr]) continue
      ws[addr].s = { font: { bold: true } }
    }

    // Auto column widths (max 40 chars)
    const colWidths = sheet.rows.reduce<number[]>((acc, row) => {
      Object.values(row).forEach((v, i) => {
        acc[i] = Math.min(40, Math.max(acc[i] ?? 10, String(v ?? '').length + 2))
      })
      return acc
    }, Object.keys(sheet.rows[0]).map(k => Math.min(40, k.length + 2)))

    ws['!cols'] = colWidths.map(w => ({ wch: w }))

    // Sheet name max 31 chars (Excel limit)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }

  XLSX.writeFile(wb, filename)
}
