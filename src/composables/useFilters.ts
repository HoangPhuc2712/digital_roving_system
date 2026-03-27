import { onBeforeUnmount, ref, watch, type Ref, type WatchSource } from 'vue'

type UseDebouncedSearchDraftOptions = {
  source: () => string
  commit: (value: string) => void
  delay?: number
}

export function useDebouncedSearchDraft(options: UseDebouncedSearchDraftOptions) {
  const searchDraft = ref(options.source())
  let searchTimer: number | undefined

  watch(
    () => options.source(),
    (value) => {
      if (searchDraft.value !== value) {
        searchDraft.value = value
      }
    },
  )

  watch(searchDraft, (value) => {
    window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      options.commit(value)
    }, options.delay ?? 300)
  })

  onBeforeUnmount(() => {
    window.clearTimeout(searchTimer)
  })

  return {
    searchDraft,
    clearSearchTimer: () => window.clearTimeout(searchTimer),
  }
}

export function useResetFirstOnFilterChange(
  source: WatchSource<unknown> | WatchSource<unknown>[] | (() => unknown),
  reset: () => void,
) {
  watch(source as any, () => {
    reset()
  })
}

export function resetFiltersWithSearchDraft(options: {
  clear: () => void
  searchDraft?: Ref<string>
  searchValue?: string
  afterClear?: () => void
}) {
  options.clear()
  if (options.searchDraft) {
    options.searchDraft.value = options.searchValue ?? ''
  }
  options.afterClear?.()
}
