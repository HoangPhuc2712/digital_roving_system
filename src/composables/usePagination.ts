import type { DataTablePageEvent } from 'primevue/datatable'
import { ref } from 'vue'

type MaybePromise<T> = T | Promise<T>

type UsePaginationOptions = {
  load: () => MaybePromise<unknown>
  setFirst: (first: number) => void
}

export function usePagination(options: UsePaginationOptions) {
  const pageLoading = ref(false)
  let requestId = 0

  async function onPage(event: DataTablePageEvent) {
    const currentRequestId = ++requestId
    options.setFirst(event.first)
    pageLoading.value = true

    try {
      await options.load()
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
