import { defineStore } from 'pinia'
import type { UserRow, UserStatusFilter } from './users.types'
import { fetchRoleOptions, fetchUserRows } from './users.api'

export const useUsersStore = defineStore('users', {
  state: () => ({
    rows: [] as UserRow[],
    loading: false,

    searchText: '' as string,
    filterRoleId: null as number | null,
    filterStatus: 'ALL' as UserStatusFilter,

    roleOptions: [] as { label: string; value: number }[],

    first: 0,
    rowsPerPage: 10,
  }),

  getters: {
    filteredRows(state): UserRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterRoleId != null && r.user_role_id !== state.filterRoleId) return false

        if (state.filterStatus === 'ACTIVE' && r.user_status !== 1) return false
        if (state.filterStatus === 'INACTIVE' && r.user_status !== 0) return false

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const [roles, rows] = await Promise.all([fetchRoleOptions(), fetchUserRows()])
        this.roleOptions = roles
        this.rows = rows
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterRoleId = null
      this.filterStatus = 'ALL'
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
