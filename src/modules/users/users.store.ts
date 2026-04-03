import { defineStore } from 'pinia'
import type { UserRow } from './users.types'
import { fetchAreaOptions, fetchRoleOptions, fetchUserRows } from './users.api'

export const useUsersStore = defineStore('users', {
  state: () => ({
    rows: [] as UserRow[],
    loading: false,

    searchText: '' as string,
    filterUserId: null as string | null,
    filterUserCode: '' as string,
    filterRoleId: null as number | null,
    filterAreaId: null as number | null,

    userOptions: [] as { label: string; value: string; searchText?: string }[],
    userCodeOptions: [] as { label: string; value: string }[],
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

        if (state.filterUserId != null && r.user_id !== state.filterUserId) return false
        if (
          state.filterUserCode.trim() &&
          !String(r.user_code ?? '')
            .toLowerCase()
            .includes(state.filterUserCode.trim().toLowerCase())
        ) {
          return false
        }
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

        const fallbackUserOptions = Array.from(
          new Map(
            rows
              .filter((r) => String(r.user_id).trim() && String(r.user_name).trim())
              .map((r) => [
                String(r.user_id),
                {
                  label: String(r.user_name),
                  searchText: String(
                    [r.user_name, r.user_code, r.user_keyword].filter(Boolean).join(' '),
                  )
                    .toLowerCase()
                    .trim(),
                },
              ]),
          ).entries(),
        )
          .map(([value, option]) => ({ value, ...option }))
          .sort((a, b) => a.label.localeCompare(b.label))

        const fallbackUserCodeOptions = Array.from(
          new Set(rows.map((r) => String(r.user_code ?? '').trim()).filter(Boolean)),
        )
          .map((value) => ({ value, label: value }))
          .sort((a, b) => a.label.localeCompare(b.label))

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
        this.userOptions = fallbackUserOptions
        this.userCodeOptions = fallbackUserCodeOptions
        this.roleOptions = roles.length ? roles : fallbackRoleOptions
        this.areaOptions = areas.length ? areas : fallbackAreaOptions
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterUserId = null
      this.filterUserCode = ''
      this.filterRoleId = null
      this.filterAreaId = null
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
