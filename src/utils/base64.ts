export type NormalizeImageOptions = {
  fallbackExt?: string
}

export type ParsedDataImage = {
  ext: string
  b64: string
  dataUrl: string
}

function sanitizeImageExtension(ext?: string, fallback = 'png') {
  const raw = String(ext ?? '')
    .trim()
    .toLowerCase()
  const normalized = raw === 'jpg' ? 'jpeg' : raw
  return normalized || fallback
}

export function isDataImageUrl(value: string) {
  return /^data:image\//i.test(String(value ?? '').trim())
}

export function isRemoteImageUrl(value: string) {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

export function normalizeImageSource(value: string, options: NormalizeImageOptions = {}) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (isDataImageUrl(raw) || isRemoteImageUrl(raw)) return raw

  const ext = sanitizeImageExtension(options.fallbackExt, 'png')
  return `data:image/${ext};base64,${raw}`
}

export function parseDataImageUrl(value: string, fallbackExt = 'png'): ParsedDataImage {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^data:image\/(\w+);base64,(.*)$/i)

  if (match) {
    const ext = sanitizeImageExtension(match[1], fallbackExt)
    const b64 = match[2] || ''
    return { ext, b64, dataUrl: `data:image/${ext};base64,${b64}` }
  }

  const ext = sanitizeImageExtension(fallbackExt, 'png')
  return {
    ext,
    b64: raw,
    dataUrl: raw ? `data:image/${ext};base64,${raw}` : '',
  }
}

export function dataUrlToBytes(dataUrl: string) {
  const parsed = parseDataImageUrl(dataUrl)
  const clean = parsed.b64.replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('FILE_READER_ERROR'))
    reader.readAsDataURL(blob)
  })
}

export async function imageSourceToDataUrl(value: string, options: NormalizeImageOptions = {}) {
  const normalized = normalizeImageSource(value, options)
  if (!normalized) return ''
  if (isDataImageUrl(normalized)) return normalized

  const response = await fetch(normalized)
  if (!response.ok) throw new Error('IMAGE_NOT_FOUND')

  const blob = await response.blob()
  return blobToDataUrl(blob)
}
