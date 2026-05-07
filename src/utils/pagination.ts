export function normalizePageSize(value: unknown, fallback = 25) {
  const rows = Number(value)
  return Number.isFinite(rows) && rows > 0 ? rows : fallback
}

export function normalizeFirst(value: unknown) {
  const first = Number(value)
  return Number.isFinite(first) && first >= 0 ? first : 0
}

export function toApiPage(first: unknown, rowsPerPage: unknown) {
  const safeFirst = normalizeFirst(first)
  const safeRows = normalizePageSize(rowsPerPage)
  return Math.floor(safeFirst / safeRows) + 1
}

export function toPrimeFirst(page: unknown, rowsPerPage: unknown) {
  const pageNumber = Number(page)
  const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? Math.floor(pageNumber) : 1
  const safeRows = normalizePageSize(rowsPerPage)
  return (safePage - 1) * safeRows
}
