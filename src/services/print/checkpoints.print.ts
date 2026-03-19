import { PDFDocument, rgb } from 'pdf-lib'

export type CheckpointPrintItem = {
  areaLabel: string
  cpName: string
  cpCode: string
  cpPriority: number | string
  qrSrc: string
}

type LoadedQrImage = {
  bytes: Uint8Array
  kind: 'png' | 'jpg'
  mimeType: 'image/png' | 'image/jpeg'
}

type TextLine = {
  text: string
  width: number
}

const ITEMS_PER_PAGE = 6
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const PAGE_MARGIN = 24
const COLUMN_GAP = 14
const ROW_GAP = 14
const SLOT_WIDTH = (PAGE_WIDTH - PAGE_MARGIN * 2 - COLUMN_GAP) / 2
const SLOT_HEIGHT = (PAGE_HEIGHT - PAGE_MARGIN * 2 - ROW_GAP * 2) / 3
const CARD_WIDTH = SLOT_WIDTH - 18
const CARD_HEIGHT = SLOT_HEIGHT
const CARD_PADDING_X = 14
const CARD_PADDING_TOP = 11
const CARD_PADDING_BOTTOM = 12
const CARD_BORDER_COLOR = '#D1D5DB'
const CARD_TEXT_COLOR = '#1F2937'
const PRIORITY_COLOR = '#111827'
const AREA_FONT_SIZE = 13
const NAME_FONT_SIZE = 16
const CODE_FONT_SIZE = 8
const PRIORITY_FONT_SIZE = 11
const PRIORITY_DIAMETER = 20
const HEADER_MIN_HEIGHT = 58
const HEADER_MAX_HEIGHT = 76
const QR_SIDE = 164
const CARD_SCALE = 2

function normalizeQr(src: string) {
  const s = String(src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/png;base64,${s}`
}

function sanitizeFileName(value: string) {
  return String(value ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function decodeBase64(base64: string) {
  const clean = base64.replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return `data:${mimeType};base64,${btoa(binary)}`
}

async function loadQrImage(src: string): Promise<LoadedQrImage> {
  const normalized = normalizeQr(src)
  if (!normalized) throw new Error('QR_IMAGE_NOT_FOUND')

  if (normalized.startsWith('data:image/')) {
    const match = normalized.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
    if (!match) throw new Error('QR_IMAGE_FORMAT_NOT_SUPPORTED')

    const ext = match[1] ?? ''
    const data = match[2] ?? ''
    const kind = ext.toLowerCase() === 'png' ? 'png' : 'jpg'
    const mimeType = kind === 'png' ? 'image/png' : 'image/jpeg'
    return {
      bytes: decodeBase64(data),
      kind,
      mimeType,
    }
  }

  const response = await fetch(normalized)
  if (!response.ok) throw new Error('QR_IMAGE_NOT_FOUND')

  const contentType = String(response.headers.get('content-type') ?? '').toLowerCase()
  const arrayBuffer = await response.arrayBuffer()
  const kind = contentType.includes('png') ? 'png' : 'jpg'
  return {
    bytes: new Uint8Array(arrayBuffer),
    kind,
    mimeType: kind === 'png' ? 'image/png' : 'image/jpeg',
  }
}

function fitText(text: unknown, maxChars: number) {
  const value = String(text ?? '').trim()
  if (!value) return ''
  if (value.length <= maxChars) return value
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

function createMeasureContext() {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('CANVAS_CONTEXT_NOT_AVAILABLE')
  return context
}

function setCanvasFont(
  context: CanvasRenderingContext2D,
  fontSize: number,
  weight: '400' | '600' | '700',
) {
  context.font = `${weight} ${fontSize}px Arial, Helvetica, sans-serif`
}

function measureTextWidth(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  weight: '400' | '600' | '700',
) {
  setCanvasFont(context, fontSize, weight)
  return context.measureText(text).width
}

function wrapText(
  text: string,
  context: CanvasRenderingContext2D,
  fontSize: number,
  weight: '400' | '600' | '700',
  maxWidth: number,
  maxLines: number,
): TextLine[] {
  const words = String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return []

  const lines: string[] = []
  let current = ''

  const pushCurrent = () => {
    if (current.trim()) lines.push(current.trim())
    current = ''
  }

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    const candidateWidth = measureTextWidth(context, candidate, fontSize, weight)

    if (candidateWidth <= maxWidth) {
      current = candidate
      continue
    }

    if (current) {
      pushCurrent()
      if (lines.length >= maxLines) break
    }

    if (measureTextWidth(context, word, fontSize, weight) <= maxWidth) {
      current = word
      continue
    }

    let chunk = ''
    for (const char of word) {
      const next = `${chunk}${char}`
      if (measureTextWidth(context, next, fontSize, weight) <= maxWidth) {
        chunk = next
      } else {
        if (chunk) lines.push(chunk)
        chunk = char
        if (lines.length >= maxLines) break
      }
    }

    if (lines.length >= maxLines) break
    current = chunk
  }

  if (lines.length < maxLines && current.trim()) pushCurrent()

  const limited = lines.slice(0, maxLines)
  if (lines.length > maxLines) {
    const lastIndex = maxLines - 1
    let last = limited[lastIndex] ?? ''
    while (last && measureTextWidth(context, `${last}…`, fontSize, weight) > maxWidth) {
      last = last.slice(0, -1)
    }
    limited[lastIndex] = `${last.trimEnd()}…`
  }

  return limited.map((line) => ({
    text: line,
    width: measureTextWidth(context, line, fontSize, weight),
  }))
}

async function loadHtmlImage(src: string) {
  const image = new Image()
  image.decoding = 'async'
  const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('QR_IMAGE_NOT_FOUND'))
  })
  image.src = src
  return loadPromise
}

function canvasToBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('QR_PDF_RENDER_FAILED'))
        return
      }
      const buffer = await blob.arrayBuffer()
      resolve(new Uint8Array(buffer))
    }, 'image/png')
  })
}

function drawCenteredText(params: {
  context: CanvasRenderingContext2D
  text: string
  x: number
  y: number
  width: number
  fontSize: number
  weight: '400' | '600' | '700'
  color: string
}) {
  const { context, text, x, y, width, fontSize, weight, color } = params
  setCanvasFont(context, fontSize, weight)
  context.fillStyle = color
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillText(text, x + width / 2, y)
}

async function renderCheckpointCard(item: CheckpointPrintItem) {
  const qrImageData = await loadQrImage(item.qrSrc)
  const qrDataUrl = bytesToDataUrl(qrImageData.bytes, qrImageData.mimeType)
  const qrImage = await loadHtmlImage(qrDataUrl)

  const renderWidth = Math.round(CARD_WIDTH * CARD_SCALE)
  const renderHeight = Math.round(CARD_HEIGHT * CARD_SCALE)
  const canvas = document.createElement('canvas')
  canvas.width = renderWidth
  canvas.height = renderHeight

  const context = canvas.getContext('2d')
  if (!context) throw new Error('CANVAS_CONTEXT_NOT_AVAILABLE')

  context.scale(CARD_SCALE, CARD_SCALE)
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  context.strokeStyle = CARD_BORDER_COLOR
  context.lineWidth = 0.8
  context.strokeRect(0.4, 0.4, CARD_WIDTH - 0.8, CARD_HEIGHT - 0.8)

  const innerX = CARD_PADDING_X
  const innerWidth = CARD_WIDTH - CARD_PADDING_X * 2
  const priorityX = CARD_WIDTH - CARD_PADDING_X - PRIORITY_DIAMETER
  const priorityY = CARD_PADDING_TOP
  const headerTop = CARD_PADDING_TOP + AREA_FONT_SIZE

  const areaLines = wrapText(
    fitText(item.areaLabel, 24),
    context,
    AREA_FONT_SIZE,
    '700',
    innerWidth,
    1,
  )
  const nameLines = wrapText(item.cpName, context, NAME_FONT_SIZE, '700', innerWidth, 2)
  const codeLines = wrapText(item.cpCode, context, CODE_FONT_SIZE, '400', innerWidth, 1)

  let cursorY = headerTop
  for (const line of areaLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: innerX,
      y: cursorY,
      width: innerWidth,
      fontSize: AREA_FONT_SIZE,
      weight: '700',
      color: CARD_TEXT_COLOR,
    })
    cursorY += AREA_FONT_SIZE * 1.02
  }

  cursorY += 11

  for (const line of nameLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: innerX,
      y: cursorY,
      width: innerWidth,
      fontSize: NAME_FONT_SIZE,
      weight: '700',
      color: CARD_TEXT_COLOR,
    })
    cursorY += NAME_FONT_SIZE * 1.08
  }

  cursorY += 2

  for (const line of codeLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: innerX,
      y: cursorY,
      width: innerWidth,
      fontSize: CODE_FONT_SIZE,
      weight: '400',
      color: CARD_TEXT_COLOR,
    })
    cursorY += CODE_FONT_SIZE * 1.04
  }

  const usedHeaderHeight = Math.min(
    HEADER_MAX_HEIGHT,
    Math.max(HEADER_MIN_HEIGHT, cursorY - CARD_PADDING_TOP),
  )

  context.strokeStyle = PRIORITY_COLOR
  context.lineWidth = 1
  context.beginPath()
  context.arc(
    priorityX + PRIORITY_DIAMETER / 2,
    priorityY + PRIORITY_DIAMETER / 2,
    PRIORITY_DIAMETER / 2,
    0,
    Math.PI * 2,
  )
  context.stroke()

  drawCenteredText({
    context,
    text: fitText(String(item.cpPriority ?? ''), 3),
    x: priorityX,
    y: priorityY + PRIORITY_DIAMETER / 2 + PRIORITY_FONT_SIZE / 2 - 1,
    width: PRIORITY_DIAMETER,
    fontSize: PRIORITY_FONT_SIZE,
    weight: '400',
    color: PRIORITY_COLOR,
  })

  const qrMaxSide = Math.min(
    QR_SIDE,
    innerWidth,
    CARD_HEIGHT - usedHeaderHeight - CARD_PADDING_BOTTOM - CARD_PADDING_TOP,
  )
  const qrX = (CARD_WIDTH - qrMaxSide) / 2
  const qrY = CARD_HEIGHT - CARD_PADDING_BOTTOM - qrMaxSide

  context.imageSmoothingEnabled = false
  context.drawImage(qrImage, qrX, qrY, qrMaxSide, qrMaxSide)

  return canvasToBytes(canvas)
}

function getGridPosition(indexInPage: number) {
  const row = Math.floor(indexInPage / 2)
  const col = indexInPage % 2
  const slotX = PAGE_MARGIN + col * (SLOT_WIDTH + COLUMN_GAP)
  const slotY = PAGE_HEIGHT - PAGE_MARGIN - SLOT_HEIGHT - row * (SLOT_HEIGHT + ROW_GAP)
  const x = slotX + (SLOT_WIDTH - CARD_WIDTH) / 2
  const y = slotY
  return { x, y }
}

function downloadPdf(bytes: Uint8Array, fileName: string) {
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFileName(fileName) || 'checkpoint_qr'}.pdf`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

async function createPdf(items: CheckpointPrintItem[], singleMode: boolean) {
  const pdf = await PDFDocument.create()

  if (singleMode) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    const { x, y } = getGridPosition(0)
    const cardBytes = await renderCheckpointCard(items[0]!)
    const cardImage = await pdf.embedPng(cardBytes)
    page.drawImage(cardImage, {
      x,
      y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    })
  } else {
    const pages = chunkItems(items, ITEMS_PER_PAGE)
    for (const itemsInPage of pages) {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      for (let i = 0; i < itemsInPage.length; i += 1) {
        const position = getGridPosition(i)
        const cardBytes = await renderCheckpointCard(itemsInPage[i]!)
        const cardImage = await pdf.embedPng(cardBytes)
        page.drawImage(cardImage, {
          x: position.x,
          y: position.y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        })
      }
    }
  }

  return pdf.save()
}

export async function printSingleCheckpointQr(item: CheckpointPrintItem) {
  const qrSrc = normalizeQr(item.qrSrc)
  if (!qrSrc) throw new Error('QR_IMAGE_NOT_FOUND')

  const bytes = await createPdf([{ ...item, qrSrc }], true)
  const fileName = `${item.areaLabel || item.cpCode || item.cpName || 'checkpoint'}_${item.cpCode || 'qr'}`
  downloadPdf(bytes, fileName)
}

export async function printCheckpointQrSheets(
  items: CheckpointPrintItem[],
  title = 'Checkpoint Qr Codes',
) {
  const normalizedItems = (items ?? [])
    .map((item) => ({
      ...item,
      qrSrc: normalizeQr(item.qrSrc),
    }))
    .filter((item) => !!item.qrSrc)

  if (!normalizedItems.length) throw new Error('QR_IMAGE_NOT_FOUND')

  const bytes = await createPdf(normalizedItems, false)
  downloadPdf(bytes, title)
}
