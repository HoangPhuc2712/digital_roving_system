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

  const colW = ws.getColumn(c).width ?? 22
  const rowH = ws.getRow(r).height ?? 72
  const cellWpx = colWidthToPx(colW)
  const cellHpx = rowHeightToPx(rowH)

  const { w: iw, h: ih } = await getImgSize(dataUrl)

  const INSET_PX = 8
  const availW = Math.max(10, cellWpx - INSET_PX * 2)
  const availH = Math.max(10, cellHpx - INSET_PX * 2)

  const scale = Math.min(availW / iw, availH / ih, 1)
  const drawW = Math.floor(iw * scale)
  const drawH = Math.floor(ih * scale)

  const offX = Math.max(0, Math.floor((cellWpx - drawW) / 2))
  const offY = Math.max(0, Math.floor((cellHpx - drawH) / 2))

  const offsetCol = offX / Math.max(1, cellWpx)
  const offsetRow = offY / Math.max(1, cellHpx)

  ws.addImage(imgId, {
    tl: { col: c - 1 + offsetCol, row: r - 1 + offsetRow },
    ext: { width: drawW, height: drawH },
    editAs: 'oneCell',
  } as any)
}

export async function exportPatrolReportXlsx(params: { rows: ReportRow[]; fileName: string }) {
  const wb = new ExcelJS.Workbook()

  // ---------- helpers ----------
  const pad2 = (n: number) => String(n).padStart(2, '0')

  function formatYMD(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  function formatHM(d: Date) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  }

  function sanitizeSheetName(name: string) {
    // Excel sheet name max 31 chars, and cannot contain: \ / ? * [ ]
    const cleaned = (name ?? '')
      .replace(/[\\\/\?\*\[\]]/g, ' ')
      .replace(/:+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return cleaned.length > 31 ? cleaned.slice(0, 31).trim() : cleaned || 'Sheet'
  }

  function uniqueSheetName(base: string) {
    let name = sanitizeSheetName(base)
    if (!wb.getWorksheet(name)) return name

    for (let i = 2; i < 1000; i++) {
      const candidate = sanitizeSheetName(`${base} (${i})`)
      if (!wb.getWorksheet(candidate)) return candidate
    }
    return sanitizeSheetName(`${base}-${Date.now()}`)
  }

  // ---------- group by guard ----------
  const groups = new Map<
    string,
    { guardKey: string; guardName: string; guardCode: string; rows: ReportRow[] }
  >()

  for (const r of params.rows ?? []) {
    const key = String(r.user_id || r.created_by || 'unknown')
    const g = groups.get(key) ?? {
      guardKey: key,
      guardName: String(r.user_name ?? '').trim() || '—',
      guardCode: String(r.user_code ?? '').trim() || '',
      rows: [],
    }
    g.rows.push(r)
    groups.set(key, g)
  }

  // Nếu không có data thì vẫn tạo 1 sheet trống để user biết
  if (groups.size === 0) {
    wb.addWorksheet('Patrol Report')
  }

  // build sheets
  for (const g of groups.values()) {
    const sorted = [...g.rows].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

    const times = sorted
      .map((x) => new Date(x.created_at).getTime())
      .filter((t) => Number.isFinite(t))

    const startDt = times.length ? new Date(Math.min(...times)) : null
    const finishDt = times.length ? new Date(Math.max(...times)) : null
    const rovingDate = startDt ? formatYMD(startDt) : '—'
    const startTime = startDt ? formatHM(startDt) : '—'
    const finishTime = finishDt ? formatHM(finishDt) : '—'

    const guardLabel = g.guardCode ? `${g.guardName} (${g.guardCode})` : g.guardName
    const sheetName = uniqueSheetName(`${guardLabel} - ${rovingDate}`)
    const ws = wb.addWorksheet(sheetName)

    // columns
    ws.columns = [
      { key: 'area', width: 12 },
      { key: 'cp', width: 22 },
      { key: 'location', width: 32 },
      { key: 'result', width: 18 },
      { key: 'note', width: 32 },
      { key: 'photo', width: 22 },
    ]
    // Guard Patrol information title
    ws.mergeCells(1, 1, 3, 3)
    ws.mergeCells(1, 4, 1, 6)
    ws.mergeCells(2, 4, 2, 6)
    ws.mergeCells(3, 4, 3, 6)

    ws.getCell(1, 1).value = `Name of the guard: ${guardLabel}`
    ws.getCell(1, 4).value = `Roving date: ${rovingDate}`
    ws.getCell(2, 4).value = `Start time: ${startTime}`
    ws.getCell(3, 4).value = `Finish time: ${finishTime}`

    for (const r of [1, 2, 3]) ws.getRow(r).height = 20

    // style info rows
    for (let rr = 1; rr <= 3; rr++) {
      for (let cc = 1; cc <= 6; cc++) {
        const cell = ws.getCell(rr, cc)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
        cell.font = { bold: true, color: { argb: 'FF0F172A' } }
        const alignRight = cc >= 4
        cell.alignment = {
          vertical: 'middle',
          horizontal: alignRight ? 'right' : 'left',
          wrapText: true,
        }
      }
    }
    ws.getCell(1, 1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

    // Table headr
    const headerRowIdx = 4
    const headers = ['Area', 'Scan Point', 'Location', 'Inspection Result', 'Note', 'Photo']
    for (let i = 0; i < headers.length; i++) {
      ws.getCell(headerRowIdx, i + 1).value = headers[i]
    }
    ws.getRow(headerRowIdx).height = 22

    for (let cc = 1; cc <= 6; cc++) {
      const cell = ws.getCell(headerRowIdx, cc)
      cell.font = { bold: true, color: { argb: 'FF0F172A' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } } // xám nhạt hơn
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
    ws.views = [{ state: 'frozen', ySplit: headerRowIdx }]

    // Data Table
    let rowCursor = headerRowIdx + 1

    for (const r of sorted) {
      const imgs = await fetchReportImagesByReportId(r.pr_id)
      const imgList = (imgs ?? []).map((x) => (x.pri_image ?? '').trim()).filter(Boolean)

      const blockRows = Math.max(1, imgList.length)
      const startRow = rowCursor
      const endRow = rowCursor + blockRows - 1

      for (let rr = startRow; rr <= endRow; rr++) ws.getRow(rr).height = 72
      const areaText = (r.area_code ?? '').trim()
      const cpText = (r.cp_name ?? '').trim()
      const locationText = (r.cp_description ?? '').trim() || '-'
      const resultText = r.pr_check ? 'OK' : 'NOT OK'
      const noteText = (r.pr_note ?? '').trim() || '-'

      ws.getCell(startRow, 1).value = areaText
      ws.getCell(startRow, 2).value = cpText
      ws.getCell(startRow, 3).value = locationText
      ws.getCell(startRow, 4).value = resultText
      ws.getCell(startRow, 5).value = noteText

      if (blockRows > 1) {
        ws.mergeCells(startRow, 1, endRow, 1)
        ws.mergeCells(startRow, 2, endRow, 2)
        ws.mergeCells(startRow, 3, endRow, 3)
        ws.mergeCells(startRow, 4, endRow, 4)
        ws.mergeCells(startRow, 5, endRow, 5)
      }

      for (let rr = startRow; rr <= endRow; rr++) {
        for (let cc = 1; cc <= 6; cc++) {
          ws.getCell(rr, cc).alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: cc !== 6,
          }
        }
      }

      const resultCell = ws.getCell(startRow, 4)
      resultCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      resultCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: r.pr_check ? 'FF16A34A' : 'FFDC2626' },
      }

      if (imgList.length > 0) {
        for (let i = 0; i < imgList.length; i++) {
          await addImageToCell(ws, wb, startRow + i, 6, imgList[i]!)
        }
      }

      for (let rr = startRow; rr <= endRow; rr++) {
        for (let cc = 1; cc <= 6; cc++) {
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
  }

  // Download
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
