import ExcelJS from 'exceljs'
import type { ReportImage, ReportNoteGroup, ReportRow } from '@/modules/reports/reports.types'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatReportDateTime(iso: string) {
  const raw = String(iso ?? '').trim()
  if (!raw) return '—'

  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) return raw

  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${d.getHours()}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function sanitizeSheetName(name: string) {
  const cleaned = (name ?? '')
    .replace(/[\\\/\?\*\[\]]/g, ' ')
    .replace(/:+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned.length > 31 ? cleaned.slice(0, 31).trim() : cleaned || 'Sheet'
}

type ExportNoteBlock = {
  noteText: string
  images: ReportImage[]
}

type ExpandedExportNoteBlock = {
  noteText: string
  photoLinks: string[]
}

const DATA_ROW_HEIGHT = 42

function buildNoteBlocks(row: ReportRow): ExportNoteBlock[] {
  const noteGroups = Array.isArray(row.note_groups) ? row.note_groups : []

  if (noteGroups.length > 0) {
    return noteGroups.map((group: ReportNoteGroup) => ({
      noteText: String(group.pri_image_note ?? '').trim() || '-',
      images: (group.report_images ?? []).filter((img) => !!String(img?.pri_image ?? '').trim()),
    }))
  }

  return [
    {
      noteText: String(row.pr_note ?? '').trim() || '-',
      images: (row.report_images ?? []).filter((img) => !!String(img?.pri_image ?? '').trim()),
    },
  ]
}

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }
}

function applyBorderRange(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) {
  for (let rr = startRow; rr <= endRow; rr++) {
    for (let cc = startCol; cc <= endCol; cc++) {
      ws.getCell(rr, cc).border = thinBorder()
    }
  }
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

function normalizePhotoLinks(images: ReportImage[]) {
  const values = (images ?? [])
    .map((img) => String(img?.pri_image ?? '').trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 10)

  const remoteLinks = values.filter((value) => isRemoteUrl(value))
  if (remoteLinks.length > 0) return remoteLinks

  if (values.length > 0) return ['Image link unavailable']

  return [] as string[]
}

function expandNoteBlocks(row: ReportRow): ExpandedExportNoteBlock[] {
  return buildNoteBlocks(row).map((block) => ({
    noteText: block.noteText,
    photoLinks: normalizePhotoLinks(block.images),
  }))
}

function estimateWrappedLines(text: string, approxCharsPerLine: number) {
  const normalized = String(text ?? '').trim()
  if (!normalized) return 1

  return normalized
    .split(/\r?\n/)
    .map((line) => Math.max(1, Math.ceil(line.length / Math.max(1, approxCharsPerLine))))
    .reduce((sum, lines) => sum + lines, 0)
}

function setPhotoCellValue(cell: ExcelJS.Cell, photoLink: string, linkIndex = 0) {
  const value = String(photoLink ?? '').trim()

  if (!value) {
    cell.value = '—'
    cell.font = { color: { argb: 'FF475569' } }
    return
  }

  if (isRemoteUrl(value)) {
    const label = `View Image${linkIndex > 0 ? ` ${linkIndex}` : ''}`
    cell.value = { text: label, hyperlink: value }
    cell.font = {
      color: { argb: 'FF2563EB' },
      underline: true,
    }
    return
  }

  cell.value = value
  cell.font = { color: { argb: 'FF475569' } }
}

export async function exportPatrolReportXlsx(params: { rows: ReportRow[]; fileName: string }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sanitizeSheetName('Patrol Abnormal Cases Report'))

  const rows = [...(params.rows ?? [])].sort((a, b) => {
    const ta = new Date(a.report_at || a.scan_at || a.created_at || '').getTime()
    const tb = new Date(b.report_at || b.scan_at || b.created_at || '').getTime()
    if (ta !== tb) return ta - tb
    return String(a.cp_name ?? '').localeCompare(String(b.cp_name ?? ''))
  })

  ws.columns = [
    { key: 'area', width: 16 },
    { key: 'checkpoint', width: 24 },
    { key: 'reportDate', width: 24 },
    { key: 'guardName', width: 20 },
    { key: 'inspectionResult', width: 18 },
    { key: 'noteDetail', width: 28 },
    { key: 'photo', width: 20 },
  ]

  ws.mergeCells(1, 1, 1, 7)
  ws.getCell(1, 1).value = 'Patrol Abnormal Cases Report'
  ws.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FF0F172A' } }
  ws.getCell(1, 1).alignment = { vertical: 'middle', horizontal: 'center' }
  ws.getRow(1).height = 24

  const headerRowIdx = 2
  const headers = [
    'Area',
    'Check Point',
    'Report Date',
    'Guard Name',
    'Inspection Result',
    'Note Detail',
    'Photo',
  ]

  for (let i = 0; i < headers.length; i += 1) {
    const cell = ws.getCell(headerRowIdx, i + 1)
    cell.value = headers[i]
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    cell.border = thinBorder()
  }
  ws.getRow(headerRowIdx).height = 22
  ws.views = [{ state: 'frozen', ySplit: headerRowIdx }]

  let rowCursor = headerRowIdx + 1

  for (const row of rows) {
    const blocks = expandNoteBlocks(row)
    const expandedRowCount = blocks.reduce((sum, block) => {
      return sum + Math.max(1, block.photoLinks.length)
    }, 0)

    const startRow = rowCursor
    const endRow = rowCursor + expandedRowCount - 1

    const areaText = String(row.area_name ?? '').trim() || '—'
    const checkpointText = String(row.cp_name ?? '').trim() || '—'
    const reportDateText = formatReportDateTime(
      String(row.report_at ?? row.scan_at ?? row.created_at ?? ''),
    )
    const guardText = String(row.report_name ?? '').trim() || '—'
    const resultText = row.pr_has_problem ? 'NOT OK' : 'OK'

    ws.getCell(startRow, 1).value = areaText
    ws.getCell(startRow, 2).value = checkpointText
    ws.getCell(startRow, 3).value = reportDateText
    ws.getCell(startRow, 4).value = guardText
    ws.getCell(startRow, 5).value = resultText

    if (expandedRowCount > 1) {
      ws.mergeCells(startRow, 1, endRow, 1)
      ws.mergeCells(startRow, 2, endRow, 2)
      ws.mergeCells(startRow, 3, endRow, 3)
      ws.mergeCells(startRow, 4, endRow, 4)
      ws.mergeCells(startRow, 5, endRow, 5)
    }

    for (let cc = 1; cc <= 5; cc += 1) {
      const cell = ws.getCell(startRow, cc)
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      if (cc === 5) {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: row.pr_has_problem ? 'FFDC2626' : 'FF16A34A' },
        }
      }
    }

    let blockCursor = startRow

    for (const block of blocks) {
      const photoLinks = block.photoLinks.length > 0 ? block.photoLinks : ['—']
      const blockStartRow = blockCursor
      const blockEndRow = blockCursor + photoLinks.length - 1
      const perRowHeight = DATA_ROW_HEIGHT

      ws.getCell(blockStartRow, 6).value = block.noteText
      ws.getCell(blockStartRow, 6).alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      }

      if (photoLinks.length > 1) {
        ws.mergeCells(blockStartRow, 6, blockEndRow, 6)
      }

      for (let i = 0; i < photoLinks.length; i += 1) {
        const currentRow = blockStartRow + i
        ws.getRow(currentRow).height = perRowHeight

        const photoCell = ws.getCell(currentRow, 7)
        setPhotoCellValue(photoCell, photoLinks[i] ?? '—', i + 1)
        photoCell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        }
      }

      blockCursor = blockEndRow + 1
    }

    applyBorderRange(ws, startRow, endRow, 1, 7)
    rowCursor = endRow + 1
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
