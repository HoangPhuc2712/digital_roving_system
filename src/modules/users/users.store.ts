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
        const [rows, roles, areas] = await Promise.all([
          fetchUserRows(),
          fetchRoleOptions().catch(() => []),
          fetchAreaOptions().catch(() => []),
        ])

        const fallbackRoleOptions = Array.from(
          new Map(
            rows
              .filter((r) => Number(r.user_role_id) > 0)
              .map((r) => [
                Number(r.user_role_id),
                String(r.role_name || r.role_code || r.user_role_id),
              ]),
          ).entries(),
        )
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label))

        const fallbackAreaOptions = Array.from(
          new Map(
            rows
              .filter((r) => Number(r.user_area_id) > 0)
              .map((r) => [
                Number(r.user_area_id),
                String(r.area_name || r.area_code || r.user_area_id),
              ]),
          ).entries(),
        )
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label))

        this.rows = rows
        this.roleOptions = roles.length ? roles : fallbackRoleOptions
        this.areaOptions = areas.length ? areas : fallbackAreaOptions
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
