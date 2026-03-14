import ExcelJS from 'exceljs'
import type { CheckpointRow } from '@/modules/checkpoints/checkpoints.types'

function normalizeQr(src: string) {
  const s = String(src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/png;base64,${s}`
}

function stripDataUrl(s: string) {
  const v = String(s ?? '').trim()
  const m = v.match(/^data:image\/(\w+);base64,(.*)$/i)
  if (m) return { ext: (m[1] || 'png').toLowerCase(), b64: m[2] || '' }
  return { ext: 'png', b64: v }
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

async function addImageToCell(
  ws: ExcelJS.Worksheet,
  wb: ExcelJS.Workbook,
  rowIndex: number,
  colIndex: number,
  rawQr: string,
) {
  const normalized = normalizeQr(rawQr)
  if (!normalized) return

  const { ext, b64 } = stripDataUrl(normalized)
  if (!b64) return

  const safeExt = ext === 'jpg' ? 'jpeg' : ext || 'png'
  const dataUrl = normalized.startsWith('data:image/')
    ? normalized
    : `data:image/${safeExt};base64,${b64}`

  const imageId = wb.addImage({
    extension: safeExt as 'png' | 'jpeg' | 'gif',
    base64: dataUrl,
  })

  const colW = ws.getColumn(colIndex).width ?? 14
  const rowH = ws.getRow(rowIndex).height ?? 54
  const cellWpx = colWidthToPx(colW)
  const cellHpx = rowHeightToPx(rowH)

  const { w: imgW, h: imgH } = await getImgSize(dataUrl)

  const insetPx = 6
  const availW = Math.max(12, cellWpx - insetPx * 2)
  const availH = Math.max(12, cellHpx - insetPx * 2)

  const scale = Math.min(availW / imgW, availH / imgH, 1)
  const drawW = Math.floor(imgW * scale)
  const drawH = Math.floor(imgH * scale)

  const offX = Math.max(0, Math.floor((cellWpx - drawW) / 2))
  const offY = Math.max(0, Math.floor((cellHpx - drawH) / 2))

  ws.addImage(imageId, {
    tl: {
      col: colIndex - 1 + offX / Math.max(1, cellWpx),
      row: rowIndex - 1 + offY / Math.max(1, cellHpx),
    },
    ext: { width: drawW, height: drawH },
    editAs: 'oneCell',
  } as any)
}

function applyCellBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }
}

export async function exportCheckpointsXlsx(params: {
  rows: CheckpointRow[]
  fileName: string
  title: string
}) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Checkpoints')

  ws.columns = [
    { header: 'Check Point Code', key: 'cp_code', width: 20 },
    { header: 'Check Point Name', key: 'cp_name', width: 24 },
    { header: 'QR Image', key: 'cp_qr', width: 14 },
    { header: 'Area', key: 'area', width: 18 },
    { header: 'Description', key: 'cp_description', width: 28 },
    { header: 'Priority', key: 'cp_priority', width: 12 },
  ]

  ws.mergeCells(1, 1, 1, 6)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = params.title
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 24

  const headerRowIndex = 2
  const headerLabels = [
    'Check Point Code',
    'Check Point Name',
    'QR Image',
    'Area',
    'Description',
    'Priority',
  ]

  for (let c = 1; c <= headerLabels.length; c++) {
    const cell = ws.getCell(headerRowIndex, c)
    cell.value = headerLabels[c - 1]
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    applyCellBorder(cell)
  }

  let currentRow = headerRowIndex + 1

  for (const row of params.rows ?? []) {
    ws.getRow(currentRow).height = 54

    ws.getCell(currentRow, 1).value = row.cp_code || '-'
    ws.getCell(currentRow, 2).value = row.cp_name || '-'
    ws.getCell(currentRow, 4).value =
      `${row.area_code || ''}${row.area_name ? `\n${row.area_name}` : ''}`
    ws.getCell(currentRow, 5).value = row.cp_description || ''
    ws.getCell(currentRow, 6).value = Number(row.cp_priority ?? 0)

    for (let c = 1; c <= 6; c++) {
      const cell = ws.getCell(currentRow, c)
      cell.alignment =
        c === 3
          ? { horizontal: 'center', vertical: 'middle' }
          : c === 6
            ? { horizontal: 'center', vertical: 'middle', wrapText: true }
            : { horizontal: 'left', vertical: 'middle', wrapText: true }
      applyCellBorder(cell)
    }

    await addImageToCell(ws, wb, currentRow, 3, row.cp_qr)

    currentRow += 1
  }

  ws.views = [{ state: 'frozen', ySplit: 2 }]

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
