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
    menuOptionsLoading: false,
    menuOptionsFetched: false,

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

        if (state.filterMenuId != null && !r.menu_ids.includes(state.filterMenuId)) return false

        return true
      })
    },
  },

  actions: {
    async ensureMenuOptionsLoaded() {
      if (this.menuOptionsLoading || this.menuOptionsFetched) return

      this.menuOptionsLoading = true
      try {
        const menus = await fetchMenuCategoryOptions().catch(() => [])
        if (menus.length) this.menuOptions = menus
        this.menuOptionsFetched = true
      } finally {
        this.menuOptionsLoading = false
      }
    },

    async ensureFormOptionsLoaded() {
      await this.ensureMenuOptionsLoaded()
    },

    async load() {
      this.loading = true
      try {
        const rows = await fetchRoleRows()

        const fallbackMenus = Array.from(
          new Map(
            rows.flatMap((row) =>
              (row.menu_ids ?? []).map((menuId, index) => [
                Number(menuId),
                {
                  value: Number(menuId),
                  label: String(row.menu_names?.[index] ?? menuId),
                  code: '',
                  priority: index,
                },
              ]),
            ),
          ).values(),
        ).sort((a, b) => (a.priority || 0) - (b.priority || 0))

        this.rows = rows
        if (!this.menuOptionsFetched && !this.menuOptions.length) {
          this.menuOptions = fallbackMenus
        }
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
