import { defineStore } from 'pinia'
import type { UserRow } from './users.types'
import { fetchRoleOptions, fetchUserRows } from './users.api'

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
        const [roles, rows] = await Promise.all([fetchRoleOptions(), fetchUserRows()])
        this.roleOptions = roles
        this.rows = rows

        const map = new Map<number, string>()
        for (const r of rows) {
          const id = r.user_area_id
          if (!id) continue
          const label = r.area_name || r.area_code || String(id)
          if (!map.has(id)) map.set(id, label)
        }
        this.areaOptions = Array.from(map.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label))
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
