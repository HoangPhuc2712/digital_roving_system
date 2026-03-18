import ExcelJS from 'exceljs'
import type { ReportImage, ReportNoteGroup, ReportRow } from '@/modules/reports/reports.types'

function stripDataUrl(s: string) {
  const v = (s ?? '').trim()
  const m = v.match(/^data:image\/(\w+);base64,(.*)$/i)
  if (m) return { ext: (m[1] || 'jpeg').toLowerCase(), b64: m[2] || '' }
  return { ext: 'jpeg', b64: v }
}

function colWidthToPx(w: number) {
  return Math.round(w * 7 + 5)
}

function rowHeightToPx(hPt: number) {
  return Math.round((hPt * 96) / 72)
}

function getImgSize(dataUrl: string) {
  return new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

async function addImagesToCellHorizontally(
  ws: ExcelJS.Worksheet,
  wb: ExcelJS.Workbook,
  r: number,
  c: number,
  images: ReportImage[],
) {
  const validImages = (images ?? [])
    .map((img) => String(img?.pri_image ?? '').trim())
    .filter(Boolean)
    .slice(0, 10)

  if (!validImages.length) return

  const colW = ws.getColumn(c).width ?? 18
  const rowH = ws.getRow(r).height ?? 72
  const cellWpx = colWidthToPx(colW)
  const cellHpx = rowHeightToPx(rowH)

  const INSET_X = 10
  const INSET_Y = 8
  const GAP_X = 8
  const SLOT_INSET_X = 2
  const SLOT_INSET_Y = 2

  const availW = Math.max(20, cellWpx - INSET_X * 2)
  const availH = Math.max(20, cellHpx - INSET_Y * 2)

  const slotW = Math.max(
    18,
    Math.floor((availW - GAP_X * (validImages.length - 1)) / validImages.length),
  )

  const contentStartX = Math.max(
    0,
    Math.floor((cellWpx - (slotW * validImages.length + GAP_X * (validImages.length - 1))) / 2),
  )

  for (const [index, raw] of validImages.entries()) {
    const { ext, b64 } = stripDataUrl(raw)
    if (!b64) continue

    const safeExt = ext === 'jpg' ? 'jpeg' : ext
    const dataUrl = raw.startsWith('data:image/') ? raw : `data:image/${safeExt};base64,${b64}`

    const { w: iw, h: ih } = await getImgSize(dataUrl)

    const innerSlotW = Math.max(12, slotW - SLOT_INSET_X * 2)
    const innerSlotH = Math.max(12, availH - SLOT_INSET_Y * 2)

    const scale = Math.min(innerSlotW / iw, innerSlotH / ih, 1)
    const drawW = Math.max(1, Math.floor(iw * scale))
    const drawH = Math.max(1, Math.floor(ih * scale))

    const slotLeftX = contentStartX + index * (slotW + GAP_X)
    const offX = slotLeftX + Math.max(0, Math.floor((slotW - drawW) / 2))
    const offY = INSET_Y + Math.max(0, Math.floor((availH - drawH) / 2))

    const imgId = wb.addImage({
      extension: safeExt as any,
      base64: dataUrl,
    })

    ws.addImage(imgId, {
      tl: {
        col: c - 1 + offX / Math.max(1, cellWpx),
        row: r - 1 + offY / Math.max(1, cellHpx),
      },
      ext: { width: drawW, height: drawH },
      editAs: 'oneCell',
    } as any)
  }
}

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

export async function exportPatrolReportXlsx(params: { rows: ReportRow[]; fileName: string }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sanitizeSheetName('Patrol Abnormal Cases Report'))

  const rows = [...(params.rows ?? [])].sort((a, b) => {
    const ta = new Date(a.report_at || a.scan_at || a.created_at || '').getTime()
    const tb = new Date(b.report_at || b.scan_at || b.created_at || '').getTime()
    if (ta !== tb) return ta - tb
    return String(a.cp_name ?? '').localeCompare(String(b.cp_name ?? ''))
  })

  const maxImagesPerBlock = Math.max(
    1,
    ...rows.flatMap((row) =>
      buildNoteBlocks(row).map((block) => Math.min(block.images.length, 10)),
    ),
  )
  const photoColumnWidth = Math.max(24, Math.min(72, 12 + maxImagesPerBlock * 6))

  ws.columns = [
    { key: 'area', width: 16 },
    { key: 'checkpoint', width: 24 },
    { key: 'reportDate', width: 24 },
    { key: 'guardName', width: 20 },
    { key: 'inspectionResult', width: 18 },
    { key: 'noteDetail', width: 28 },
    { key: 'photo', width: photoColumnWidth },
  ]

  ws.mergeCells(1, 1, 1, 7)
  ws.getCell(1, 1).value = 'Patrol Abnormal Cases Report'
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FF0F172A' } }
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

  for (let i = 0; i < headers.length; i++) {
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
    const blocks = buildNoteBlocks(row)
    const startRow = rowCursor
    const endRow = rowCursor + blocks.length - 1

    for (let rr = startRow; rr <= endRow; rr++) {
      ws.getRow(rr).height = 72
    }

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

    if (blocks.length > 1) {
      ws.mergeCells(startRow, 1, endRow, 1)
      ws.mergeCells(startRow, 2, endRow, 2)
      ws.mergeCells(startRow, 3, endRow, 3)
      ws.mergeCells(startRow, 4, endRow, 4)
      ws.mergeCells(startRow, 5, endRow, 5)
    }

    for (let cc = 1; cc <= 5; cc++) {
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
      ws.getCell(blockCursor, 6).value = block.noteText
      ws.getCell(blockCursor, 6).alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      }

      ws.getCell(blockCursor, 7).alignment = { vertical: 'middle', horizontal: 'center' }

      if (block.images.length > 0) {
        await addImagesToCellHorizontally(ws, wb, blockCursor, 7, block.images)
      } else {
        ws.getCell(blockCursor, 7).value = ''
      }

      blockCursor += 1
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
