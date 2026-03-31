import ExcelJS from 'exceljs'
import type { RouteRow } from '@/modules/routes/routes.types'

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }
}

function buildRouteDetailText(row: RouteRow) {
  const parts = (row.details ?? [])
    .map((detail) => String(detail.cp_priority ?? '').trim())
    .filter(Boolean)

  return parts.length ? parts.join(' -> ') : '-'
}

async function saveWorkbook(wb: ExcelJS.Workbook, fileName: string) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportRoutesXlsx(params: { rows: RouteRow[]; fileName: string }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Patrol Routes')

  ws.columns = [
    { header: 'Route Code', key: 'route_code', width: 18 },
    { header: 'Route Name', key: 'route_name', width: 20 },
    { header: 'Area', key: 'area_name', width: 20 },
    { header: 'Role', key: 'role_name', width: 20 },
    { header: 'Priority', key: 'route_priority', width: 12 },
    { header: 'Maximum Time', key: 'route_max_minute', width: 16 },
    { header: 'Minimum Time', key: 'route_min_minute', width: 16 },
    { header: 'Route Detail', key: 'route_detail', width: 32 },
  ]

  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(1, c)
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    applyBorder(cell)
  }

  for (const row of params.rows ?? []) {
    ws.addRow({
      route_code: row.route_code || '-',
      route_name: row.route_name || '-',
      area_name: row.area_name || '-',
      role_name: row.role_name || row.role_code || '-',
      route_priority: Number(row.route_priority ?? 0),
      route_max_minute: Number(row.route_max_minute ?? 0),
      route_min_minute: Number(row.route_min_minute ?? 0),
      route_detail: buildRouteDetailText(row),
    })
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.height = 60
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 5 ? 'center' : 'left',
        wrapText: true,
      }
      applyBorder(cell)
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  await saveWorkbook(wb, params.fileName)
}
