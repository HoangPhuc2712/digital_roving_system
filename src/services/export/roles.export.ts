import ExcelJS from 'exceljs'
import type { RoleRow } from '@/modules/roles/roles.types'
import { translateMenuCategoryName, translateRoleName } from '@/utils/dataI18n'
import { excelT } from './exportI18n'

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
  const ws = wb.addWorksheet(excelT('breadcrumb.roles', 'Roles'))

  ws.columns = [
    { header: excelT('roleList.roleCode', 'Role Code'), key: 'role_code', width: 18 },
    { header: excelT('roleList.roleName', 'Role Name'), key: 'role_name', width: 24 },
    { header: excelT('roleList.accessPermission', 'Permission'), key: 'permissions', width: 40 },
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
      Array.isArray(row.menu_names) && row.menu_names.length
        ? row.menu_names
            .map((name) => translateMenuCategoryName(name, (key) => excelT(key, name)))
            .join(', ')
        : Number(row.menu_count ?? 0) > 0
          ? `${Number(row.menu_count ?? 0)} ${excelT('roleList.accessPermissionNumber', 'access permission(s)')}`
          : '-'

    ws.addRow({
      role_code: row.role_code || '-',
      role_name: row.role_name
        ? translateRoleName(row.role_name, (key) => excelT(key, row.role_name))
        : '-',
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
