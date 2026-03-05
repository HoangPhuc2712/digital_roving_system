import { defineStore } from 'pinia'
import type { UserRow } from './users.types'
import { fetchAreaOptions, fetchRoleOptions, fetchUserRows } from './users.api'

export const useUsersStore = defineStore('users', {
  state: () => ({
    rows: [] as UserRow[],
    loading: false,

    searchText: '' as string,
    filterRoleId: null as number | null,
    filterAreaId: null as number | null,

    roleOptions: [] as { label: string; value: number }[],
    areaOptions: [] as { label: string; value: number }[],

    first: 0,
    rowsPerPage: 10,
  }),

  getters: {
    filteredRows(state): UserRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterRoleId != null && r.user_role_id !== state.filterRoleId) return false
        if (state.filterAreaId != null && r.user_area_id !== state.filterAreaId) return false

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const [roles, areas, rows] = await Promise.all([
          fetchRoleOptions(),
          fetchAreaOptions(),
          fetchUserRows(),
        ])

        this.roleOptions = roles
        this.areaOptions = areas
        this.rows = rows
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterRoleId = null
      this.filterAreaId = null
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
