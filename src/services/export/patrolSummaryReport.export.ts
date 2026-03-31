import ExcelJS from 'exceljs'
import type { PatrolSummaryReportRow } from '@/modules/reports/reports.types'

function hexToArgb(hex: string) {
  const value = String(hex ?? '')
    .trim()
    .replace('#', '')
    .toUpperCase()
  return `FF${value || 'FFFFFF'}`
}

function formatRate(rate: number) {
  return `${Number(rate ?? 0).toFixed(2)}%`
}

export async function exportPatrolSummaryReportXlsx(params: {
  rows: PatrolSummaryReportRow[]
  fileName: string
  chartBase64?: string
}) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('summaryReportOfSecurityPatrol')

  if (params.chartBase64) {
    const imageId = wb.addImage({
      base64: params.chartBase64,
      extension: 'png',
    })

    ws.addImage(imageId, 'A1:J18')
  }

  const startRow = 21
  ws.mergeCells(startRow, 1, startRow, 10)
  const titleCell = ws.getCell(startRow, 1)
  titleCell.value = 'summaryReportOfSecurityPatrol'
  titleCell.font = { bold: true, size: 13 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

  const headerRowIndex = startRow + 1
  const headers = [
    'Patrol Date',
    'Patrol Area',
    'Required Number of Patrols',
    'Actual Patrol Count',
    'Missed Patrols Count',
    'Too Short Patrol Count',
    'Too Long Patrol Count',
    'Insufficient Number of Patrols',
    'Shift Problem Count',
    'Abnormal Rate',
  ]

  ws.columns = [
    { key: 'date_label', width: 18 },
    { key: 'area_name', width: 18 },
    { key: 'required_count', width: 22 },
    { key: 'actual_count', width: 18 },
    { key: 'missed_count', width: 18 },
    { key: 'time_slow_problem_count', width: 20 },
    { key: 'time_fast_problem_count', width: 20 },
    { key: 'insufficient_count', width: 24 },
    { key: 'shift_problem_count', width: 18 },
    { key: 'abnormal_rate', width: 16 },
  ]

  headers.forEach((header, index) => {
    const cell = ws.getCell(headerRowIndex, index + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: 'FF111827' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  const grouped = new Map<string, PatrolSummaryReportRow[]>()
  for (const row of params.rows ?? []) {
    const current = grouped.get(row.date_key) ?? []
    current.push(row)
    grouped.set(row.date_key, current)
  }

  let currentRow = headerRowIndex + 1

  for (const [, items] of grouped.entries()) {
    const startGroupRow = currentRow

    for (const item of items) {
      ws.getCell(currentRow, 1).value = item.date_label
      ws.getCell(currentRow, 2).value = item.area_name
      ws.getCell(currentRow, 3).value = item.required_count
      ws.getCell(currentRow, 4).value = item.actual_count
      ws.getCell(currentRow, 5).value = item.missed_count
      ws.getCell(currentRow, 6).value = item.time_slow_problem_count
      ws.getCell(currentRow, 7).value = item.time_fast_problem_count
      ws.getCell(currentRow, 8).value = item.insufficient_count
      ws.getCell(currentRow, 9).value = item.shift_problem_count
      ws.getCell(currentRow, 10).value = formatRate(item.abnormal_rate)

      for (let c = 1; c <= 10; c++) {
        const cell = ws.getCell(currentRow, c)
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      }

      if (item.actual_count < item.required_count) {
        ws.getCell(currentRow, 4).font = { color: { argb: hexToArgb('#EF4444') } }
      }
      if (item.missed_count > 0) {
        ws.getCell(currentRow, 5).font = { color: { argb: hexToArgb('#EF4444') } }
      }
      if (item.time_slow_problem_count > 0) {
        ws.getCell(currentRow, 6).font = { color: { argb: hexToArgb('#EF4444') } }
      }
      if (item.time_fast_problem_count > 0) {
        ws.getCell(currentRow, 7).font = { color: { argb: hexToArgb('#EF4444') } }
      }
      if (item.insufficient_count > 0) {
        ws.getCell(currentRow, 8).font = { color: { argb: hexToArgb('#EF4444') } }
      }
      if (item.shift_problem_count > 0) {
        ws.getCell(currentRow, 9).font = { color: { argb: hexToArgb('#EF4444') } }
      }

      currentRow += 1
    }

    if (items.length > 1) {
      ws.mergeCells(startGroupRow, 1, currentRow - 1, 1)
    }
  }

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
