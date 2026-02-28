import { defineStore } from 'pinia'
import type { MenuCategoryOption, RoleRow, RoleStatusFilter } from './roles.types'
import { fetchMenuCategoryOptions, fetchRoleRows } from './roles.api'

export const useRolesStore = defineStore('roles', {
  state: () => ({
    rows: [] as RoleRow[],
    loading: false,

    searchText: '' as string,
    filterStatus: 'ALL' as RoleStatusFilter,
    filterMenuId: null as number | null,

    menuOptions: [] as MenuCategoryOption[],

    first: 0,
    rowsPerPage: 10,
  }),

  getters: {
    filteredRows(state): RoleRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterStatus === 'ACTIVE' && r.role_status !== 1) return false
        if (state.filterStatus === 'INACTIVE' && r.role_status !== 0) return false

        if (state.filterMenuId != null && !r.menu_ids.includes(state.filterMenuId)) return false

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const [menus, rows] = await Promise.all([fetchMenuCategoryOptions(), fetchRoleRows()])
        this.menuOptions = menus
        this.rows = rows
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterStatus = 'ALL'
      this.filterMenuId = null
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
