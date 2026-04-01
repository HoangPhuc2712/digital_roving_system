import type { LocationQuery, LocationQueryValue } from 'vue-router'

function firstQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? '').trim()
  return String(value ?? '').trim()
}

function parseDateTimeValue(rawValue: string): Date | null {
  const raw = rawValue.trim()
  if (!raw) return null

  let decoded = raw

  try {
    decoded = decodeURIComponent(raw.replace(/\+/g, ' '))
  } catch {
    decoded = raw.replace(/\+/g, ' ')
  }

  const collapsed = decoded.replace(/\s+/g, ' ').trim()
  const normalized = collapsed.includes('T') ? collapsed : collapsed.replace(' ', 'T')

  const parsed = new Date(normalized)
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed
}

export function parseReportMailDateRange(query: LocationQuery): {
  from: Date | null
  to: Date | null
  hasQuery: boolean
} {
  const fromRaw = firstQueryValue(query.fromDate) || firstQueryValue(query.fromdateTime)
  const toRaw = firstQueryValue(query.toDate) || firstQueryValue(query.todateTime)

  return {
    from: parseDateTimeValue(fromRaw),
    to: parseDateTimeValue(toRaw),
    hasQuery: Boolean(fromRaw || toRaw),
  }
}
