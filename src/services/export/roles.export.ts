import ExcelJS from 'exceljs'
import type { RoleRow } from '@/modules/roles/roles.types'

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

export async function exportRolesXlsx(params: { rows: RoleRow[]; fileName: string }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Roles')

  ws.columns = [
    { header: 'Role Code', key: 'role_code', width: 18 },
    { header: 'Role Name', key: 'role_name', width: 24 },
    { header: 'Permission', key: 'permissions', width: 40 },
  ]

  for (let c = 1; c <= 3; c++) {
    const cell = ws.getCell(1, c)
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    applyBorder(cell)
  }

  for (const row of params.rows ?? []) {
    const permissionText =
      Array.isArray(row.menu_names) && row.menu_names.length ? row.menu_names.join(', ') : '-'

    ws.addRow({
      role_code: row.role_code || '-',
      role_name: row.role_name || '-',
      permissions: permissionText,
    })
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.height = 60
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      applyBorder(cell)
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  await saveWorkbook(wb, params.fileName)
}
