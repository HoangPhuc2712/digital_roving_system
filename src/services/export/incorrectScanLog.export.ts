import ExcelJS from 'exceljs'
import type { IncorrectScanLogRow } from '@/modules/reports/reports.types'

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

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }
}

function buildCheckpointRichText(params: { name: string; code: string; colorArgb?: string }) {
  const name = params.name || '-'
  const code = params.code || '-'
  const color = params.colorArgb

  return {
    richText: [
      {
        text: name,
        font: {
          size: 11,
          ...(color ? { color: { argb: color } } : {}),
        },
      },
      {
        text: `\n${code}`,
        font: {
          size: 9,
          ...(color ? { color: { argb: color } } : {}),
        },
      },
    ],
  }
}

export async function exportIncorrectScanLogXlsx(params: {
  rows: IncorrectScanLogRow[]
  fileName: string
}) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Incorrect Scan Log')

  ws.columns = [
    { header: 'Route Name', key: 'route_name', width: 28 },
    { header: 'Start Time', key: 'ps_start_at', width: 24 },
    { header: 'Finish Time', key: 'ps_end_at', width: 24 },
    { header: 'Patrol Time', key: 'created_at', width: 24 },
    { header: 'Incorrect CP Scan', key: 'wrong_scan', width: 26 },
    { header: 'Correct CP Scan', key: 'correct_scan', width: 26 },
    { header: 'Guard Name', key: 'created_name', width: 20 },
  ]

  for (let c = 1; c <= 7; c++) {
    const cell = ws.getCell(1, c)
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    applyBorder(cell)
  }

  for (const row of params.rows ?? []) {
    const excelRow = ws.addRow({
      route_name: row.route_name || '-',
      ps_start_at: formatDateTime(row.ps_start_at),
      ps_end_at: formatDateTime(row.ps_end_at),
      created_at: formatDateTime(row.created_at),
      wrong_scan: '',
      correct_scan: '',
      created_name: row.created_name || '-',
    })

    excelRow.getCell(5).value = buildCheckpointRichText({
      name: row.wrong_cp_name || '-',
      code: row.wrong_cp_code || '-',
      colorArgb: 'FFDC2626',
    })
    excelRow.getCell(6).value = buildCheckpointRichText({
      name: row.correct_cp_name || '-',
      code: row.correct_cp_code || '-',
    })
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.height = 32
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      applyBorder(cell)
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
