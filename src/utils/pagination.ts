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

export type ApiPageParams = {
  page?: number
  pageSize?: number
}

export type ApiQueryResultData<T> = {
  items?: T[]
  totalCount?: number
  page?: number
  pageSize?: number
  totalPage?: number
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

export type ApiPagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function normalizeApiArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  if (value == null) return []
  return [value]
}

export function normalizePagedData<T>(
  value: T | T[] | ApiQueryResultData<T> | null | undefined,
): ApiPagedResult<T> {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'items' in value) {
    const data = value as ApiQueryResultData<T>
    const items = normalizeApiArray(data.items ?? [])
    const totalCount = Number(data.totalCount ?? items.length)
    const page = Number(data.page ?? 1)
    const pageSize = Number(data.pageSize ?? items.length)
    const totalPage = Number(
      data.totalPage ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1),
    )

    return {
      items,
      totalCount: Number.isFinite(totalCount) ? totalCount : items.length,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : items.length,
      totalPage: Number.isFinite(totalPage) ? totalPage : 1,
      hasNextPage: Boolean(data.hasNextPage),
      hasPreviousPage: Boolean(data.hasPreviousPage),
    }
  }

  const items = normalizeApiArray(value as T | T[] | null | undefined)

  return {
    items,
    totalCount: items.length,
    page: 1,
    pageSize: items.length,
    totalPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  }
}

export function appendPageParams(body: Record<string, any>, params: ApiPageParams = {}) {
  if (params.page != null && Number.isFinite(Number(params.page))) {
    body.page = Number(params.page)
  }

  if (params.pageSize != null && Number.isFinite(Number(params.pageSize))) {
    body.pageSize = Number(params.pageSize)
  }
}
