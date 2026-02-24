import ExcelJS from 'exceljs'
import type { ReportRow } from '@/modules/reports/reports.types'
import { fetchReportImagesByReportId } from '@/modules/reports/reports.api'

function stripDataUrl(s: string) {
  const v = (s ?? '').trim()
  const m = v.match(/^data:image\/(\w+);base64,(.*)$/i)
  if (m) return { ext: (m[1] || 'jpeg').toLowerCase(), b64: m[2] || '' }
  return { ext: 'jpeg', b64: v }
}

function colWidthToPx(w: number) {
  // xấp xỉ Excel column width -> px
  return Math.round(w * 7 + 5)
}

function rowHeightToPx(hPt: number) {
  // point -> px
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

const EMU_PER_PX = 9525

async function addImageToCell(
  ws: ExcelJS.Worksheet,
  wb: ExcelJS.Workbook,
  r: number,
  c: number,
  base64: string,
) {
  const { ext, b64 } = stripDataUrl(base64)
  if (!b64) return

  const safeExt = ext === 'jpg' ? 'jpeg' : ext
  const dataUrl = base64.trim().startsWith('data:image/')
    ? base64.trim()
    : `data:image/${safeExt};base64,${b64}`

  const imgId = wb.addImage({
    extension: safeExt as any,
    base64: dataUrl,
  })

  // --- cell size ---
  const colW = ws.getColumn(c).width ?? 22
  const rowH = ws.getRow(r).height ?? 72 // points
  const cellWpx = colWidthToPx(colW)
  const cellHpx = rowHeightToPx(rowH)

  // --- image natural size ---
  const { w: iw, h: ih } = await getImgSize(dataUrl)

  const borderPx = 2
  const paddingPx = 12
  const margin = borderPx + paddingPx

  const availW = Math.max(10, cellWpx - margin * 2)
  const availH = Math.max(10, cellHpx - margin * 2)

  const scale = Math.min(availW / iw, availH / ih, 1)
  const drawW = Math.floor(iw * scale)
  const drawH = Math.floor(ih * scale)

  const offX = margin + Math.floor((availW - drawW) / 2)
  const offY = margin + Math.floor((availH - drawH) / 2)

  ws.addImage(imgId, {
    tl: {
      col: c - 1,
      row: r - 1,
      colOff: offX * EMU_PER_PX,
      rowOff: offY * EMU_PER_PX,
    },
    ext: { width: drawW, height: drawH },
    editAs: 'oneCell',
  } as any)
}

export async function exportPatrolReportXlsx(params: { rows: ReportRow[]; fileName: string }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Patrol Report')

  ws.columns = [
    { header: 'Area', key: 'area', width: 18 },
    { header: 'Scan Point', key: 'cp', width: 26 },
    { header: 'Inspection Result', key: 'result', width: 18 },
    { header: 'Note', key: 'note', width: 32 },
    { header: 'Photo', key: 'photo', width: 22 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  ws.getRow(1).height = 22

  let rowCursor = 2
  const sorted = [...params.rows].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

  for (const r of sorted) {
    const imgs = await fetchReportImagesByReportId(r.pr_id)
    const imgList = (imgs ?? []).map((x) => (x.pri_image ?? '').trim()).filter(Boolean)

    const blockRows = Math.max(1, imgList.length)
    const startRow = rowCursor
    const endRow = rowCursor + blockRows - 1

    for (let rr = startRow; rr <= endRow; rr++) ws.getRow(rr).height = 72

    const areaText = [r.area_code, r.area_name].filter(Boolean).join('\n')
    const cpText = [r.cp_name, r.cp_description].filter(Boolean).join('\n')
    const resultText = r.pr_check ? 'OK' : 'NOT OK'
    const noteText = (r.pr_note ?? '').trim() || '-'

    ws.getCell(startRow, 1).value = areaText
    ws.getCell(startRow, 2).value = cpText
    ws.getCell(startRow, 3).value = resultText
    ws.getCell(startRow, 4).value = noteText

    if (blockRows > 1) {
      ws.mergeCells(startRow, 1, endRow, 1)
      ws.mergeCells(startRow, 2, endRow, 2)
      ws.mergeCells(startRow, 3, endRow, 3)
      ws.mergeCells(startRow, 4, endRow, 4)
    }

    for (let c = 1; c <= 4; c++) {
      ws.getCell(startRow, c).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }
    }

    if (imgList.length > 0) {
      for (let i = 0; i < imgList.length; i++) {
        await addImageToCell(ws, wb, startRow + i, 5, imgList[i]!)
      }
    }

    for (let rr = startRow; rr <= endRow; rr++) {
      for (let cc = 1; cc <= 5; cc++) {
        ws.getCell(rr, cc).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      }
    }

    rowCursor += blockRows
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
