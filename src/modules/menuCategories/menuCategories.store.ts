import { defineStore } from 'pinia'
import type { MenuCategoryRow, MenuCategoryStatusFilter } from './menuCategories.types'
import { fetchMenuCategoryRows } from './menuCategories.api'

export const useMenuCategoriesStore = defineStore('menuCategories', {
  state: () => ({
    rows: [] as MenuCategoryRow[],
    loading: false,

    searchText: '' as string,
    filterStatus: 'ALL' as MenuCategoryStatusFilter,

    first: 0,
    rowsPerPage: 10,
  }),

  getters: {
    filteredRows(state): MenuCategoryRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterStatus === 'ACTIVE' && !r.mc_active) return false
        if (state.filterStatus === 'INACTIVE' && r.mc_active) return false

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        this.rows = await fetchMenuCategoryRows()
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
