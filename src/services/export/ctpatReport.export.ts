import ExcelJS from 'exceljs'
import type { CtpatReportRow } from '@/modules/reports/reports.types'

function formatDateTime(iso: string) {
  const s = (iso ?? '').trim()
  if (!s) return ''
  const d = new Date(s)
  if (!Number.isFinite(d.getTime())) return s
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}:${pad2(d.getSeconds())}`
}

export async function exportCtpatReportXlsx(params: { rows: CtpatReportRow[]; fileName: string }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('C-TPAT Report')

  ws.columns = [
    { header: 'Patrol Routes', key: 'route_name', width: 30 },
    { header: 'Check Points', key: 'check_point_name', width: 36 },
    { header: 'Start Time', key: 'start_at', width: 24 },
    { header: 'Finish Time', key: 'end_at', width: 24 },
    { header: 'Patrol Time', key: 'scan_at', width: 24 },
    { header: 'Guard Name', key: 'report_name', width: 22 },
    { header: 'Route Order', key: 'cp_priority', width: 14 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.height = 22
  headerRow.font = { bold: true, color: { argb: 'FF0F172A' } }

  for (let c = 1; c <= 7; c++) {
    const cell = ws.getCell(1, c)
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  }

  for (const row of params.rows ?? []) {
    ws.addRow({
      route_name: row.route_name || '-',
      check_point_name: row.check_point_name || '-',
      start_at: formatDateTime(row.start_at),
      end_at: formatDateTime(row.end_at),
      scan_at: formatDateTime(row.scan_at),
      report_name: row.report_name || '-',
      cp_priority: row.cp_priority,
    })
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.height = 20
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = params.fileName.endsWith('.xlsx') ? params.fileName : `${params.fileName}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
