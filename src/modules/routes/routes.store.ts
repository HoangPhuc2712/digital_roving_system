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
        const [areas, roles] = await Promise.all([fetchAreaOptions(), fetchRoleOptions()])
        this.areaOptions = areas
        this.roleOptions = roles
        this.rows = await fetchRouteRows(roles)
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
