import type { DataTablePageEvent } from 'primevue/datatable'
import { ref } from 'vue'
import { normalizeFirst, normalizePageSize, toApiPage } from '@/utils/pagination'

type MaybePromise<T> = T | Promise<T>

export type PaginationLoadParams = {
  first: number
  rows: number
  page: number
  pageSize: number
}

type UsePaginationOptions = {
  load: (params?: PaginationLoadParams) => MaybePromise<unknown>
  setFirst: (first: number) => void
  setPage?: (first: number, rows: number) => void
}

export function usePagination(options: UsePaginationOptions) {
  const pageLoading = ref(false)
  let requestId = 0

  async function onPage(event: DataTablePageEvent) {
    const currentRequestId = ++requestId
    const pageSize = normalizePageSize(event.rows)
    const first = normalizeFirst(event.first)
    const page = toApiPage(first, pageSize)

    if (options.setPage) {
      options.setPage(first, pageSize)
    } else {
      options.setFirst(first)
    }

    pageLoading.value = true

    try {
      await options.load({
        first,
        rows: pageSize,
        page,
        pageSize,
      })
    } finally {
      if (currentRequestId === requestId) {
        pageLoading.value = false
      }
    }
  }

  return {
    onPage,
    pageLoading,
  }
}
