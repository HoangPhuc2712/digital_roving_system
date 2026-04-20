import { defineStore } from 'pinia'
import type { MenuCategoryOption, RoleRow, RoleStatusFilter } from './roles.types'
import { fetchMenuCategoryOptions, fetchRoleRows } from './roles.api'

export const useRolesStore = defineStore('roles', {
  state: () => ({
    rows: [] as RoleRow[],
    loading: false,

    searchText: '' as string,
    filterStatus: 'ALL' as RoleStatusFilter,

    menuOptions: [] as MenuCategoryOption[],
    menuOptionsLoading: false,

    first: 0,
    rowsPerPage: 25,
  }),

  getters: {
    filteredRows(state): RoleRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterStatus === 'ACTIVE' && r.role_status !== 1) return false
        if (state.filterStatus === 'INACTIVE' && r.role_status !== 0) return false

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        this.rows = await fetchRoleRows()
      } finally {
        this.loading = false
      }
    },

    async ensureMenuOptionsLoaded(force = false) {
      if (this.menuOptionsLoading) return
      if (!force && this.menuOptions.length > 0) return

      this.menuOptionsLoading = true
      try {
        this.menuOptions = await fetchMenuCategoryOptions()
      } finally {
        this.menuOptionsLoading = false
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
