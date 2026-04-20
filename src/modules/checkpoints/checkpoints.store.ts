import { defineStore } from 'pinia'
import type {
  CheckpointRow,
  CheckpointStatusFilter,
  AreaOption,
  RoleOption,
  CheckpointRoleFilterValue,
} from './checkpoints.types'
import { fetchAreaOptions, fetchCheckpointRows, fetchRoleOptions } from './checkpoints.api'

export const useCheckpointsStore = defineStore('checkpoints', {
  state: () => ({
    rows: [] as CheckpointRow[],
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
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterAreaId != null && r.area_id !== state.filterAreaId) return false
        if (state.filterCheckPointName != null && r.cp_name !== state.filterCheckPointName)
          return false

        if (state.filterStatus === 'ACTIVE' && r.cp_status !== 1) return false
        if (state.filterStatus === 'INACTIVE' && r.cp_status !== 0) return false

        if (Array.isArray(state.filterRoleIds) && state.filterRoleIds.length > 0) {
          const roleIds = Array.isArray(r.role_ids) ? r.role_ids : []
          const hasMatchedRole = state.filterRoleIds.some((roleId) => roleIds.includes(roleId))
          if (!hasMatchedRole) return false
        }

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
        const roles = await fetchRoleOptions().catch(() => [])
        const rows = await fetchCheckpointRows(roles)

        const fallbackAreaOptions = Array.from(
          new Map(
            rows
              .filter((r) => Number(r.area_id) > 0)
              .map((r) => [Number(r.area_id), String(r.area_name || r.area_code || r.area_id)]),
          ).entries(),
        )
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label))

        this.rows = rows
        this.roleOptions = roles
        this.roleOptionsFetched = true
        if (!this.areaOptionsFetched && !this.areaOptions.length) {
          this.areaOptions = fallbackAreaOptions
        }
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaId = null
      this.filterCheckPointName = null
      this.filterStatus = 'ALL'
      this.filterRoleIds = []
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
