import ExcelJS from 'exceljs'
import type { PatrolDetailReportRow } from '@/modules/reports/reports.types'

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

function hexToArgb(hex: string) {
  const value = String(hex ?? '')
    .trim()
    .replace('#', '')
    .toUpperCase()
  return `FF${value || 'FFFFFF'}`
}

export async function exportPatrolDetailReportXlsx(params: {
  rows: PatrolDetailReportRow[]
  fileName: string
}) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Patrol Detail Report')

  ws.columns = [
    { header: 'Route Name', key: 'route_name', width: 30 },
    { header: 'Check Point', key: 'check_point_name', width: 28 },
    { header: 'Start Time', key: 'start_time', width: 24 },
    { header: 'Finish Time', key: 'finish_time', width: 24 },
    { header: 'Patrol Time', key: 'patrol_time', width: 24 },
    { header: 'Patrol Guard', key: 'report_name', width: 20 },
    { header: 'Event Information Zh', key: 'event_zh', width: 24 },
    { header: 'Event Information Vi', key: 'event_vi', width: 24 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.height = 22

  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(1, c)
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
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
      start_time: formatDateTime(row.start_time),
      finish_time: formatDateTime(row.finish_time),
      patrol_time: formatDateTime(row.patrol_time),
      report_name: row.report_name || '-',
      event_zh: row.event_zh || '',
      event_vi: row.event_vi || '',
    })
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    row.height = 20
    const data = params.rows[rowNumber - 2]
    const fillColor = hexToArgb(data?.shift_color || '#FFFFFF')

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }

      if (colNumber === 3 || colNumber === 4) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        }
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
