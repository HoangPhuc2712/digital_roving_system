import { defineStore } from 'pinia'
import type { AreaOption, RoleOption, RouteRow, RouteStatusFilter } from './routes.types'
import { fetchAreaOptions, fetchRoleOptions, fetchRouteRows } from './routes.api'

export const useRoutesStore = defineStore('routes', {
  state: () => ({
    rows: [] as RouteRow[],
    loading: false,

    searchText: '' as string,
    filterAreaId: null as number | null,
    filterStatus: 'ALL' as RouteStatusFilter,

    areaOptions: [] as AreaOption[],
    roleOptions: [] as RoleOption[],

    first: 0,
    rowsPerPage: 10,
  }),

  getters: {
    filteredRows(state): RouteRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterAreaId != null && r.area_id !== state.filterAreaId) return false

        if (state.filterStatus === 'ACTIVE' && r.route_status !== 1) return false
        if (state.filterStatus === 'INACTIVE' && r.route_status !== 0) return false

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const roles = await fetchRoleOptions().catch(() => [])
        const [areas, rows] = await Promise.all([
          fetchAreaOptions().catch(() => []),
          fetchRouteRows(roles),
        ])

        const fallbackAreaOptions = Array.from(
          new Map(
            rows
              .filter((r) => Number(r.area_id) > 0)
              .map((r) => [Number(r.area_id), String(r.area_name || r.area_code || r.area_id)]),
          ).entries(),
        )
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label))

        const fallbackRoleOptions = Array.from(
          new Map(
            rows
              .filter((r) => Number(r.role_id) > 0)
              .map((r) => [Number(r.role_id), String(r.role_name || r.role_code || r.role_id)]),
          ).entries(),
        )
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label))

        this.rows = rows
        this.areaOptions = areas.length ? areas : fallbackAreaOptions
        this.roleOptions = roles.length ? roles : fallbackRoleOptions
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaId = null
      this.filterStatus = 'ALL'
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
