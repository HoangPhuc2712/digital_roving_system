import { defineStore } from 'pinia'
import type { AreaRow, AreaStatusFilter } from './areas.types'
import { fetchAreaRows } from './areas.api'

export const useAreasStore = defineStore('areas', {
  state: () => ({
    rows: [] as AreaRow[],
    loading: false,

    searchText: '' as string,
    filterStatus: 'ALL' as AreaStatusFilter,

    first: 0,
    rowsPerPage: 10,
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
        this.rows = await fetchAreaRows()
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
  },
})
