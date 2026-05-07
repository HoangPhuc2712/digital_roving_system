import { defineStore } from 'pinia'
import { toApiPage } from '@/utils/pagination'
import type { AreaRow, AreaStatusFilter } from './areas.types'
import { fetchAreaRowsPaged } from './areas.api'

export const useAreasStore = defineStore('areas', {
  state: () => ({
    rows: [] as AreaRow[],
    loading: false,

    searchText: '' as string,
    filterStatus: 'ALL' as AreaStatusFilter,

    first: 0,
    rowsPerPage: 25,
    totalRecords: 0,
  }),

  getters: {
    filteredRows(state): AreaRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterStatus === 'ACTIVE' && r.area_status !== 1) return false
        if (state.filterStatus === 'INACTIVE' && r.area_status !== 0) return false

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const result = await fetchAreaRowsPaged({
          page: toApiPage(this.first, this.rowsPerPage),
          pageSize: this.rowsPerPage,
        })
        this.rows = result.items
        this.totalRecords = result.totalCount
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterStatus = 'ALL'
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },

    setPage(first: number, rowsPerPage: number) {
      this.first = first
      this.rowsPerPage = rowsPerPage
    },
  },
})
