import { PDFDocument } from 'pdf-lib'
import { dataUrlToBytes, imageSourceToDataUrl, normalizeImageSource } from '@/utils/base64'

export type CheckpointPrintItem = {
  areaLabel: string
  cpName: string
  cpCode: string
  cpPriority: number | string
  qrSrc: string
}

export type CheckpointQrLayout = '1x2' | '2x2' | '3x2'

type CardOrientation = 'standard' | 'rotated'

const DEFAULT_CHECKPOINT_QR_LAYOUT: CheckpointQrLayout = '3x2'

const LAYOUT_DIMENSIONS: Record<CheckpointQrLayout, { rows: number; columns: number }> = {
  '1x2': { rows: 2, columns: 1 },
  '2x2': { rows: 2, columns: 2 },
  '3x2': { rows: 3, columns: 2 },
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

type LayoutMetrics = {
  layout: CheckpointQrLayout
  orientation: CardOrientation
  rows: number
  columns: number
  itemsPerPage: number
  slotWidth: number
  slotHeight: number
  cardWidth: number
  cardHeight: number
  columnGap: number
  rowGap: number
  paddingX: number
  paddingTop: number
  paddingBottom: number
  areaFontSize: number
  titleFontSize: number
  nameFontSize: number
  priorityFontSize: number
  priorityDiameter: number
  headerMinHeight: number
  headerMaxHeight: number
  qrSideCap: number
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const PAGE_MARGIN = 24
const CARD_BORDER_COLOR = '#D1D5DB'
const CARD_TEXT_COLOR = '#1F2937'
const PRIORITY_COLOR = '#111827'
const BASE_COLUMN_GAP = 24
const BASE_ROW_GAP = 28
const BASE_SLOT_WIDTH = (PAGE_WIDTH - PAGE_MARGIN * 2 - BASE_COLUMN_GAP) / 2
const BASE_SLOT_HEIGHT = (PAGE_HEIGHT - PAGE_MARGIN * 2 - BASE_ROW_GAP * 2) / 3
const BASE_CARD_WIDTH = BASE_SLOT_WIDTH - 18
const BASE_CARD_HEIGHT = BASE_SLOT_HEIGHT
const BASE_CARD_PADDING_X = 14
const BASE_CARD_PADDING_TOP = 11
const BASE_CARD_PADDING_BOTTOM = 12
const BASE_AREA_FONT_SIZE = 13
const BASE_TITLE_FONT_SIZE = 16
const BASE_NAME_FONT_SIZE = 14
const BASE_PRIORITY_FONT_SIZE = 11
const BASE_PRIORITY_DIAMETER = 20
const BASE_HEADER_MIN_HEIGHT = 58
const BASE_HEADER_MAX_HEIGHT = 76
const BASE_QR_SIDE = 164
const CARD_SCALE = 2

function getLayoutMetrics(
  layout: CheckpointQrLayout = DEFAULT_CHECKPOINT_QR_LAYOUT,
): LayoutMetrics {
  const dimensions = LAYOUT_DIMENSIONS[layout] ?? LAYOUT_DIMENSIONS[DEFAULT_CHECKPOINT_QR_LAYOUT]
  const { rows, columns } = dimensions
  const columnGap = columns > 1 ? BASE_COLUMN_GAP : 0
  const rowGap = rows > 1 ? BASE_ROW_GAP : 0
  const slotWidth = (PAGE_WIDTH - PAGE_MARGIN * 2 - columnGap * Math.max(columns - 1, 0)) / columns
  const slotHeight = (PAGE_HEIGHT - PAGE_MARGIN * 2 - rowGap * Math.max(rows - 1, 0)) / rows

  let cardWidth = Math.max(120, slotWidth - 18)
  let cardHeight = Math.max(120, slotHeight)
  let orientation: CardOrientation = 'standard'

  if (layout === '1x2') {
    cardWidth = Math.max(220, Math.min(slotWidth - 88, slotHeight * 1.72))
    cardHeight = Math.max(180, slotHeight - 12)
  } else if (layout === '2x2') {
    cardWidth = Math.max(160, slotWidth - 22)
    cardHeight = Math.max(180, slotHeight - 20)
    orientation = 'rotated'
  }

  const scale = Math.max(0.9, Math.min(cardWidth / BASE_CARD_WIDTH, cardHeight / BASE_CARD_HEIGHT))

  let qrSideCap = Math.max(BASE_QR_SIDE * scale, Math.min(cardWidth, cardHeight) * 0.64)
  if (layout === '1x2') {
    qrSideCap = Math.max(qrSideCap, Math.min(cardWidth, cardHeight) * 0.7)
  }
  if (layout === '2x2') {
    qrSideCap = Math.max(qrSideCap, Math.min(cardWidth, cardHeight) * 0.84)
  }

  return {
    layout,
    orientation,
    rows,
    columns,
    itemsPerPage: rows * columns,
    slotWidth,
    slotHeight,
    cardWidth,
    cardHeight,
    columnGap,
    rowGap,
    paddingX: BASE_CARD_PADDING_X * scale,
    paddingTop: BASE_CARD_PADDING_TOP * scale,
    paddingBottom: BASE_CARD_PADDING_BOTTOM * scale,
    areaFontSize: BASE_AREA_FONT_SIZE * scale,
    titleFontSize: BASE_TITLE_FONT_SIZE * scale,
    nameFontSize: BASE_NAME_FONT_SIZE * scale,
    priorityFontSize: BASE_PRIORITY_FONT_SIZE * scale,
    priorityDiameter: BASE_PRIORITY_DIAMETER * scale,
    headerMinHeight: BASE_HEADER_MIN_HEIGHT * scale,
    headerMaxHeight: BASE_HEADER_MAX_HEIGHT * scale,
    qrSideCap,
  }
}

function normalizeQr(src: string) {
  return normalizeImageSource(src, { fallbackExt: 'png' })
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

  const dataUrl = await imageSourceToDataUrl(normalized, { fallbackExt: 'png' })
  if (!dataUrl) throw new Error('QR_IMAGE_NOT_FOUND')

  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!match) throw new Error('QR_IMAGE_FORMAT_NOT_SUPPORTED')

  const ext = match[1] ?? ''
  const kind = ext.toLowerCase() === 'png' ? 'png' : 'jpg'
  const mimeType = kind === 'png' ? 'image/png' : 'image/jpeg'

  return {
    bytes: dataUrlToBytes(dataUrl),
    kind,
    mimeType,
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

function drawPriorityBadge(
  context: CanvasRenderingContext2D,
  metrics: LayoutMetrics,
  cpPriority: number | string,
  rotateText = false,
) {
  const priorityX = metrics.cardWidth - metrics.paddingX - metrics.priorityDiameter
  const priorityY = metrics.paddingTop
  const badgeCenterX = priorityX + metrics.priorityDiameter / 2
  const badgeCenterY = priorityY + metrics.priorityDiameter / 2

  context.strokeStyle = PRIORITY_COLOR
  context.lineWidth = 1
  context.beginPath()
  context.arc(badgeCenterX, badgeCenterY, metrics.priorityDiameter / 2, 0, Math.PI * 2)
  context.stroke()

  context.save()
  context.translate(badgeCenterX, badgeCenterY)
  if (rotateText) {
    context.rotate(Math.PI / 2)
  }
  setCanvasFont(context, metrics.priorityFontSize, '400')
  context.fillStyle = PRIORITY_COLOR
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(fitText(String(cpPriority ?? ''), 3), 0, 0)
  context.restore()
}

function drawStandardCardContent(params: {
  context: CanvasRenderingContext2D
  item: CheckpointPrintItem
  qrImage: HTMLImageElement
  metrics: LayoutMetrics
  availableWidth?: number
  availableHeight?: number
  compactHeader?: boolean
  qrBottomInset?: number
}) {
  const {
    context,
    item,
    qrImage,
    metrics,
    availableWidth = metrics.cardWidth,
    availableHeight = metrics.cardHeight,
    compactHeader = false,
    qrBottomInset = 0,
  } = params

  const innerX = metrics.paddingX
  const innerWidth = availableWidth - metrics.paddingX * 2
  const headerTop = metrics.paddingTop + metrics.areaFontSize
  const measureContext = createMeasureContext()

  const areaLines = wrapText(
    fitText(item.areaLabel, compactHeader ? 20 : 24),
    measureContext,
    metrics.areaFontSize,
    '700',
    innerWidth,
    1,
  )

  const titleLines = wrapText(
    `Điểm tuần tra số ${String(item.cpPriority ?? '')}`,
    measureContext,
    metrics.titleFontSize,
    '700',
    innerWidth,
    compactHeader ? 1 : 2,
  )

  const nameLines = wrapText(
    item.cpName,
    measureContext,
    metrics.nameFontSize,
    '700',
    innerWidth,
    1,
  )

  let cursorY = headerTop
  for (const line of areaLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: innerX,
      y: cursorY,
      width: innerWidth,
      fontSize: metrics.areaFontSize,
      weight: '700',
      color: CARD_TEXT_COLOR,
    })
    cursorY += metrics.areaFontSize * 1.02
  }

  cursorY += compactHeader
    ? 7 * (metrics.titleFontSize / BASE_TITLE_FONT_SIZE)
    : 11 * (metrics.titleFontSize / BASE_TITLE_FONT_SIZE)

  for (const line of titleLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: innerX,
      y: cursorY,
      width: innerWidth,
      fontSize: metrics.titleFontSize,
      weight: '700',
      color: CARD_TEXT_COLOR,
    })
    cursorY += metrics.titleFontSize * 1.08
  }

  cursorY += compactHeader ? 0 : 2 * (metrics.nameFontSize / BASE_NAME_FONT_SIZE)

  for (const line of nameLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: innerX,
      y: cursorY,
      width: innerWidth,
      fontSize: metrics.nameFontSize,
      weight: '700',
      color: CARD_TEXT_COLOR,
    })
    cursorY += metrics.nameFontSize * 1.08
  }

  const headerMinHeight = compactHeader ? metrics.headerMinHeight * 0.76 : metrics.headerMinHeight
  const headerMaxHeight = compactHeader ? metrics.headerMaxHeight * 0.82 : metrics.headerMaxHeight
  const usedHeaderHeight = Math.min(
    headerMaxHeight,
    Math.max(headerMinHeight, cursorY - metrics.paddingTop),
  )

  const qrMaxSide = Math.min(
    metrics.qrSideCap,
    innerWidth,
    availableHeight - usedHeaderHeight - metrics.paddingBottom - metrics.paddingTop - qrBottomInset,
  )
  const qrX = (availableWidth - qrMaxSide) / 2
  const qrY = availableHeight - metrics.paddingBottom - qrBottomInset - qrMaxSide

  context.imageSmoothingEnabled = false
  context.drawImage(qrImage, qrX, qrY, qrMaxSide, qrMaxSide)
}

function createTwoByTwoTextCanvas(item: CheckpointPrintItem, metrics: LayoutMetrics) {
  const areaFontSize = metrics.areaFontSize * 0.88
  const titleFontSize = metrics.titleFontSize * 0.82
  const nameFontSize = metrics.nameFontSize * 0.84
  const measureContext = createMeasureContext()

  const blockWidth = Math.max(104, Math.min(metrics.cardHeight * 0.32, 124))
  const innerWidth = Math.max(86, blockWidth - 10)

  const areaLines = wrapText(
    fitText(item.areaLabel, 20),
    measureContext,
    areaFontSize,
    '700',
    innerWidth,
    1,
  )

  const titleLines = wrapText(
    `Điểm tuần tra số ${String(item.cpPriority ?? '')}`,
    measureContext,
    titleFontSize,
    '700',
    innerWidth,
    2,
  )

  const nameLines = wrapText(item.cpName, measureContext, nameFontSize, '700', innerWidth, 3)

  const areaLineHeight = areaFontSize * 1.02
  const titleLineHeight = titleFontSize * 1.06
  const nameLineHeight = nameFontSize * 1.06
  const gapAfterArea = 6 * (titleFontSize / BASE_TITLE_FONT_SIZE)
  const gapAfterTitle = 3 * (nameFontSize / BASE_NAME_FONT_SIZE)
  const topInset = 2
  const bottomInset = 2

  const blockHeight =
    topInset +
    areaLines.length * areaLineHeight +
    gapAfterArea +
    titleLines.length * titleLineHeight +
    gapAfterTitle +
    nameLines.length * nameLineHeight +
    bottomInset

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(blockWidth * CARD_SCALE))
  canvas.height = Math.max(1, Math.ceil(blockHeight * CARD_SCALE))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('CANVAS_CONTEXT_NOT_AVAILABLE')

  context.scale(CARD_SCALE, CARD_SCALE)
  context.clearRect(0, 0, blockWidth, blockHeight)

  let cursorY = topInset + areaFontSize
  for (const line of areaLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: 0,
      y: cursorY,
      width: blockWidth,
      fontSize: areaFontSize,
      weight: '700',
      color: CARD_TEXT_COLOR,
    })
    cursorY += areaLineHeight
  }

  cursorY += gapAfterArea

  for (const line of titleLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: 0,
      y: cursorY,
      width: blockWidth,
      fontSize: titleFontSize,
      weight: '700',
      color: CARD_TEXT_COLOR,
    })
    cursorY += titleLineHeight
  }

  cursorY += gapAfterTitle

  for (const line of nameLines) {
    drawCenteredText({
      context,
      text: line.text,
      x: 0,
      y: cursorY,
      width: blockWidth,
      fontSize: nameFontSize,
      weight: '700',
      color: CARD_TEXT_COLOR,
    })
    cursorY += nameLineHeight
  }

  return {
    canvas,
    width: blockWidth,
    height: blockHeight,
  }
}

function drawImageRotated(params: {
  context: CanvasRenderingContext2D
  image: CanvasImageSource
  centerX: number
  centerY: number
  drawWidth: number
  drawHeight: number
  angleRadians: number
}) {
  const { context, image, centerX, centerY, drawWidth, drawHeight, angleRadians } = params
  context.save()
  context.translate(centerX, centerY)
  context.rotate(angleRadians)
  context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  context.restore()
}

function drawTwoByTwoCardContent(
  context: CanvasRenderingContext2D,
  item: CheckpointPrintItem,
  qrImage: HTMLImageElement,
  metrics: LayoutMetrics,
) {
  const textBlock = createTwoByTwoTextCanvas(item, metrics)

  const textTop = metrics.paddingTop + 16
  const textCenterX = metrics.cardWidth / 2
  const textCenterY = textTop + textBlock.width / 2

  drawImageRotated({
    context,
    image: textBlock.canvas,
    centerX: textCenterX,
    centerY: textCenterY,
    drawWidth: textBlock.width,
    drawHeight: textBlock.height,
    angleRadians: Math.PI / 2,
  })

  const textBottom = textTop + textBlock.width
  const qrTop = textBottom + 12
  const qrSide = Math.min(
    metrics.qrSideCap,
    metrics.cardWidth - metrics.paddingX * 2 - 12,
    metrics.cardHeight - qrTop - metrics.paddingBottom - 8,
  )
  const qrX = (metrics.cardWidth - qrSide) / 2
  const qrY = Math.max(qrTop, metrics.cardHeight - metrics.paddingBottom - 8 - qrSide)

  context.imageSmoothingEnabled = false
  drawImageRotated({
    context,
    image: qrImage,
    centerX: qrX + qrSide / 2,
    centerY: qrY + qrSide / 2,
    drawWidth: qrSide,
    drawHeight: qrSide,
    angleRadians: Math.PI / 2,
  })
}

async function renderCheckpointCard(item: CheckpointPrintItem, metrics: LayoutMetrics) {
  const qrImageData = await loadQrImage(item.qrSrc)
  const qrDataUrl = bytesToDataUrl(qrImageData.bytes, qrImageData.mimeType)
  const qrImage = await loadHtmlImage(qrDataUrl)

  const renderWidth = Math.round(metrics.cardWidth * CARD_SCALE)
  const renderHeight = Math.round(metrics.cardHeight * CARD_SCALE)
  const canvas = document.createElement('canvas')
  canvas.width = renderWidth
  canvas.height = renderHeight

  const context = canvas.getContext('2d')
  if (!context) throw new Error('CANVAS_CONTEXT_NOT_AVAILABLE')

  context.scale(CARD_SCALE, CARD_SCALE)
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, metrics.cardWidth, metrics.cardHeight)
  context.strokeStyle = CARD_BORDER_COLOR
  context.lineWidth = 1
  context.strokeRect(0.5, 0.5, metrics.cardWidth - 1, metrics.cardHeight - 1)

  if (metrics.layout === '2x2') {
    drawTwoByTwoCardContent(context, item, qrImage, metrics)
  } else {
    drawStandardCardContent({
      context,
      item,
      qrImage,
      metrics,
      compactHeader: metrics.layout === '1x2',
      qrBottomInset: metrics.layout === '1x2' ? 1 : 0,
    })
  }

  drawPriorityBadge(context, metrics, item.cpPriority, metrics.layout === '2x2')

  return canvasToBytes(canvas)
}

function getGridPosition(indexInPage: number, metrics: LayoutMetrics) {
  const row = Math.floor(indexInPage / metrics.columns)
  const col = indexInPage % metrics.columns
  const slotX = PAGE_MARGIN + col * (metrics.slotWidth + metrics.columnGap)
  const slotY =
    PAGE_HEIGHT - PAGE_MARGIN - metrics.slotHeight - row * (metrics.slotHeight + metrics.rowGap)
  const x = slotX + (metrics.slotWidth - metrics.cardWidth) / 2
  const y = slotY + (metrics.slotHeight - metrics.cardHeight) / 2
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

async function createPdf(
  items: CheckpointPrintItem[],
  singleMode: boolean,
  layout: CheckpointQrLayout = DEFAULT_CHECKPOINT_QR_LAYOUT,
) {
  const pdf = await PDFDocument.create()
  const metrics = getLayoutMetrics(layout)

  if (singleMode) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    const { x, y } = getGridPosition(0, metrics)
    const cardBytes = await renderCheckpointCard(items[0]!, metrics)
    const cardImage = await pdf.embedPng(cardBytes)
    page.drawImage(cardImage, {
      x,
      y,
      width: metrics.cardWidth,
      height: metrics.cardHeight,
    })
  } else {
    const pages = chunkItems(items, metrics.itemsPerPage)
    for (const itemsInPage of pages) {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      for (let i = 0; i < itemsInPage.length; i += 1) {
        const position = getGridPosition(i, metrics)
        const cardBytes = await renderCheckpointCard(itemsInPage[i]!, metrics)
        const cardImage = await pdf.embedPng(cardBytes)
        page.drawImage(cardImage, {
          x: position.x,
          y: position.y,
          width: metrics.cardWidth,
          height: metrics.cardHeight,
        })
      }
    }
  }

  return pdf.save()
}

export async function printSingleCheckpointQr(
  item: CheckpointPrintItem,
  layout: CheckpointQrLayout = DEFAULT_CHECKPOINT_QR_LAYOUT,
) {
  const qrSrc = normalizeQr(item.qrSrc)
  if (!qrSrc) throw new Error('QR_IMAGE_NOT_FOUND')

  const bytes = await createPdf([{ ...item, qrSrc }], true, layout)
  const fileName = `${item.areaLabel || item.cpCode || item.cpName || 'checkpoint'}_${item.cpCode || 'qr'}`
  downloadPdf(bytes, fileName)
}

export async function printCheckpointQrSheets(
  items: CheckpointPrintItem[],
  title = 'Checkpoint Qr Codes',
  layout: CheckpointQrLayout = DEFAULT_CHECKPOINT_QR_LAYOUT,
) {
  const normalizedItems = (items ?? [])
    .map((item) => ({
      ...item,
      qrSrc: normalizeQr(item.qrSrc),
    }))
    .filter((item) => !!item.qrSrc)

  if (!normalizedItems.length) throw new Error('QR_IMAGE_NOT_FOUND')

  const bytes = await createPdf(normalizedItems, false, layout)
  downloadPdf(bytes, title)
}

export { DEFAULT_CHECKPOINT_QR_LAYOUT }
