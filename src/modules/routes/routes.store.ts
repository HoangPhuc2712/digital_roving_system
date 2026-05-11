import { defineStore } from 'pinia'
import { fetchAllPagedRows, toApiPage } from '@/utils/pagination'
import type { AreaOption, RoleOption, RouteRow, RouteStatusFilter } from './routes.types'
import { fetchAreaOptions, fetchRoleOptions, fetchRouteRowsPaged } from './routes.api'

function toApiRouteStatus(filterStatus: RouteStatusFilter) {
  return filterStatus === 'ACTIVE' ? 0 : filterStatus === 'INACTIVE' ? 1 : null
}

function filterRouteRows(
  rows: RouteRow[],
  searchText: string,
  filterAreaId: number | null,
  filterRoleId: number | null,
  filterStatus: RouteStatusFilter,
) {
  const q = searchText.trim().toLowerCase()

  return rows.filter((r) => {
    if (q && (!r._q || !r._q.includes(q))) return false

    if (filterAreaId != null && r.area_id !== filterAreaId) return false
    if (filterRoleId != null && r.role_id !== filterRoleId) return false

    if (filterStatus === 'ACTIVE' && r.route_status !== 1) return false
    if (filterStatus === 'INACTIVE' && r.route_status !== 0) return false

    return true
  })
}

function buildFallbackAreaOptions(rows: RouteRow[]) {
  return Array.from(
    new Map(
      rows
        .filter((r) => Number(r.area_id) > 0)
        .map((r) => [Number(r.area_id), String(r.area_name || r.area_code || r.area_id)]),
    ).entries(),
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function buildFallbackRoleOptions(rows: RouteRow[]) {
  return Array.from(
    new Map(
      rows
        .filter((r) => Number(r.role_id) > 0)
        .map((r) => [Number(r.role_id), String(r.role_name || r.role_code || r.role_id)]),
    ).entries(),
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

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
    totalRecords: 0,
  }),

  getters: {
    filteredRows(state): RouteRow[] {
      return filterRouteRows(
        state.rows,
        state.searchText,
        state.filterAreaId,
        state.filterRoleId,
        state.filterStatus,
      )
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
        const routeStatus = toApiRouteStatus(this.filterStatus)

        const result = await fetchRouteRowsPaged([], {
          page: toApiPage(this.first, this.rowsPerPage),
          pageSize: this.rowsPerPage,
          routeKeyword: this.searchText,
          areaId: this.filterAreaId,
          roleId: this.filterRoleId,
          routeStatus,
        })
        const rows = result.items

        this.rows = rows
        this.totalRecords = result.totalCount
        if (!this.areaOptionsFetched && !this.areaOptions.length) {
          this.areaOptions = buildFallbackAreaOptions(rows)
        }
        if (!this.roleOptionsFetched && !this.roleOptions.length) {
          this.roleOptions = buildFallbackRoleOptions(rows)
        }
      } finally {
        this.loading = false
      }
    },

    async getRowsForExport() {
      const routeStatus = toApiRouteStatus(this.filterStatus)
      const rows = await fetchAllPagedRows((pageParams) =>
        fetchRouteRowsPaged([], {
          ...pageParams,
          routeKeyword: this.searchText,
          areaId: this.filterAreaId,
          roleId: this.filterRoleId,
          routeStatus,
        }),
      )

      return filterRouteRows(
        rows,
        this.searchText,
        this.filterAreaId,
        this.filterRoleId,
        this.filterStatus,
      )
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

    setPage(first: number, rowsPerPage: number) {
      this.first = first
      this.rowsPerPage = rowsPerPage
    },
  },
})
