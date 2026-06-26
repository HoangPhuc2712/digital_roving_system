import type ExcelJS from 'exceljs'

export async function createExcelWorkbook() {
  const module = await import('exceljs')
  const Excel = (module.default ?? module) as any
  return new Excel.Workbook() as ExcelJS.Workbook
}
