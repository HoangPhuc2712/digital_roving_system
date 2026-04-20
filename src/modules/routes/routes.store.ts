import { defineStore } from 'pinia'
import type { AreaOption, RoleOption, RouteRow, RouteStatusFilter } from './routes.types'
import { fetchAreaOptions, fetchRoleOptions, fetchRouteRows } from './routes.api'

export const useRoutesStore = defineStore('routes', {
  state: () => ({
    rows: [] as RouteRow[],
    loading: false,

    searchText: '' as string,
    filterAreaId: null as number | null,
    filterRoleId: null as number | null,
    filterStatus: 'ALL' as RouteStatusFilter,

    areaOptions: [] as AreaOption[],
    roleOptions: [] as RoleOption[],

    areaOptionsLoading: false,
    roleOptionsLoading: false,
    areaOptionsFetched: false,
    roleOptionsFetched: false,

    first: 0,
    rowsPerPage: 25,
  }),

  getters: {
    filteredRows(state): RouteRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterAreaId != null && r.area_id !== state.filterAreaId) return false
        if (state.filterRoleId != null && r.role_id !== state.filterRoleId) return false

        if (state.filterStatus === 'ACTIVE' && r.route_status !== 1) return false
        if (state.filterStatus === 'INACTIVE' && r.route_status !== 0) return false

        return true
      })
    },
  },

  actions: {
    async ensureAreaOptionsLoaded() {
      if (this.areaOptionsLoading || this.areaOptionsFetched) return

      this.areaOptionsLoading = true
      try {
        const areas = await fetchAreaOptions().catch(() => [])
        if (areas.length) this.areaOptions = areas
        this.areaOptionsFetched = true
      } finally {
        this.areaOptionsLoading = false
      }
    },

    async ensureRoleOptionsLoaded() {
      if (this.roleOptionsLoading || this.roleOptionsFetched) return

      this.roleOptionsLoading = true
      try {
        const roles = await fetchRoleOptions().catch(() => [])
        if (roles.length) this.roleOptions = roles
        this.roleOptionsFetched = true
      } finally {
        this.roleOptionsLoading = false
      }
    },

    async load() {
      this.loading = true
      try {
        const rows = await fetchRouteRows()

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
        if (!this.areaOptionsFetched && !this.areaOptions.length) {
          this.areaOptions = fallbackAreaOptions
        }
        if (!this.roleOptionsFetched && !this.roleOptions.length) {
          this.roleOptions = fallbackRoleOptions
        }
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaId = null
      this.filterRoleId = null
      this.filterStatus = 'ALL'
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
