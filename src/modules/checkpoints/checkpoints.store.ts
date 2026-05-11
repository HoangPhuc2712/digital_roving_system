import { defineStore } from 'pinia'
import { fetchAllPagedRows, toApiPage } from '@/utils/pagination'
import type {
  CheckpointRow,
  CheckpointStatusFilter,
  AreaOption,
  RoleOption,
  CheckpointRoleFilterValue,
} from './checkpoints.types'
import { fetchAreaOptions, fetchCheckpointRows, fetchRoleOptions } from './checkpoints.api'

function filterCheckpointRows(
  rows: CheckpointRow[],
  searchText: string,
  filterAreaId: number | null,
  filterCheckPointName: string | null,
  filterStatus: CheckpointStatusFilter,
  filterRoleIds: CheckpointRoleFilterValue,
) {
  const q = searchText.trim().toLowerCase()

  return rows.filter((r) => {
    if (q && (!r._q || !r._q.includes(q))) return false

    if (filterAreaId != null && r.area_id !== filterAreaId) return false
    if (filterCheckPointName != null && r.cp_name !== filterCheckPointName) return false

    if (filterStatus === 'ACTIVE' && r.cp_status !== 1) return false
    if (filterStatus === 'INACTIVE' && r.cp_status !== 0) return false

    if (Array.isArray(filterRoleIds) && filterRoleIds.length > 0) {
      const roleIds = Array.isArray(r.role_ids) ? r.role_ids : []
      const hasMatchedRole = filterRoleIds.some((roleId) => roleIds.includes(roleId))
      if (!hasMatchedRole) return false
    }

    return true
  })
}

function buildFallbackAreaOptions(rows: CheckpointRow[]) {
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

export const useCheckpointsStore = defineStore('checkpoints', {
  state: () => ({
    rows: [] as CheckpointRow[],
    totalRecords: 0,
    loading: false,

    searchText: '' as string,
    filterAreaId: null as number | null,
    filterCheckPointName: null as string | null,
    filterStatus: 'ALL' as CheckpointStatusFilter,
    filterRoleIds: [] as CheckpointRoleFilterValue,

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
    checkPointNameOptions(state): { label: string; value: string; searchText?: string }[] {
      const seen = new Set<string>()
      const options: { label: string; value: string; searchText?: string }[] = []

      for (const row of state.rows) {
        if (state.filterAreaId != null && row.area_id !== state.filterAreaId) continue

        const value = String(row.cp_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({
          label: value,
          value,
          searchText: String([row.cp_name, row.cp_code, row.cp_keyword].join(' '))
            .toLowerCase()
            .trim(),
        })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    filteredRows(state): CheckpointRow[] {
      return filterCheckpointRows(
        state.rows,
        state.searchText,
        state.filterAreaId,
        state.filterCheckPointName,
        state.filterStatus,
        state.filterRoleIds,
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
        const result = await fetchCheckpointRows(this.roleOptions, {
          page: toApiPage(this.first, this.rowsPerPage),
          pageSize: this.rowsPerPage,
          areaId: this.filterAreaId,
          roleIds: this.filterRoleIds,
        })
        const rows = result.items

        this.rows = rows
        this.totalRecords = result.totalCount
        if (!this.areaOptionsFetched && !this.areaOptions.length) {
          this.areaOptions = buildFallbackAreaOptions(rows)
        }
      } finally {
        this.loading = false
      }
    },

    async getRowsForExport() {
      const rows = await fetchAllPagedRows((pageParams) =>
        fetchCheckpointRows(this.roleOptions, {
          ...pageParams,
          areaId: this.filterAreaId,
          roleIds: this.filterRoleIds,
        }),
      )

      return filterCheckpointRows(
        rows,
        this.searchText,
        this.filterAreaId,
        this.filterCheckPointName,
        this.filterStatus,
        this.filterRoleIds,
      )
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaId = null
      this.filterCheckPointName = null
      this.filterStatus = 'ALL'
      this.filterRoleIds = []
      this.first = 0
      this.totalRecords = 0
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
