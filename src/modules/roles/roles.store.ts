import { defineStore } from 'pinia'
import type { MenuCategoryOption, RoleRow, RoleStatusFilter } from './roles.types'
import { fetchAllPagedRows, toApiPage } from '@/utils/pagination'
import { fetchMenuCategoryOptions, fetchRoleById, fetchRoleRowsPaged } from './roles.api'

function filterRoleRows(rows: RoleRow[], searchText: string, filterStatus: RoleStatusFilter) {
  const q = searchText.trim().toLowerCase()

  return rows.filter((r) => {
    if (q && (!r._q || !r._q.includes(q))) return false

    if (filterStatus === 'ACTIVE' && r.role_status !== 1) return false
    if (filterStatus === 'INACTIVE' && r.role_status !== 0) return false

    return true
  })
}

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
    totalRecords: 0,
  }),

  getters: {
    filteredRows(state): RoleRow[] {
      return filterRoleRows(state.rows, state.searchText, state.filterStatus)
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const result = await fetchRoleRowsPaged({
          page: toApiPage(this.first, this.rowsPerPage),
          pageSize: this.rowsPerPage,
        })
        this.rows = result.items
        this.totalRecords = result.totalCount
      } finally {
        this.loading = false
      }
    },

    async getRowsForExport() {
      const rows = await fetchAllPagedRows((pageParams) => fetchRoleRowsPaged(pageParams))
      const filteredRows = filterRoleRows(rows, this.searchText, this.filterStatus)

      const detailRows = await Promise.all(
        filteredRows.map(async (row) => {
          if (Array.isArray(row.menu_names) && row.menu_names.length > 0) return row

          try {
            const detail = await fetchRoleById(row.role_id)
            return {
              ...row,
              menu_ids: Array.isArray(detail?.menu_ids) ? detail.menu_ids : row.menu_ids,
              menu_names: Array.isArray(detail?.menu_names) ? detail.menu_names : row.menu_names,
            }
          } catch {
            return row
          }
        }),
      )

      return detailRows
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

    setPage(first: number, rowsPerPage: number) {
      this.first = first
      this.rowsPerPage = rowsPerPage
    },
  },
})
