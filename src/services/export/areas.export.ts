import ExcelJS from 'exceljs'
import type { AreaRow } from '@/modules/areas/areas.types'

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }
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

export async function exportAreasXlsx(params: { rows: AreaRow[]; fileName: string }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Areas')

  ws.columns = [
    { header: 'Area Code', key: 'area_code', width: 18 },
    { header: 'Area Name', key: 'area_name', width: 24 },
    { header: 'Area Check Points', key: 'checkpoint_count', width: 18 },
  ]

  for (let c = 1; c <= 3; c++) {
    const cell = ws.getCell(1, c)
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    applyBorder(cell)
  }

  for (const row of params.rows ?? []) {
    ws.addRow({
      area_code: row.area_code || '-',
      area_name: row.area_name || '-',
      checkpoint_count: Number(row.total_checkpoints ?? 0),
    })
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.height = 20
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 3 ? 'center' : 'left',
        wrapText: true,
      }
      applyBorder(cell)
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  await saveWorkbook(wb, params.fileName)
}
