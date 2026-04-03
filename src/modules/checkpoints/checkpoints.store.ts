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

    first: 0,
    rowsPerPage: 10,
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
    async load() {
      this.loading = true
      try {
        const [areas, roles] = await Promise.all([
          fetchAreaOptions().catch(() => []),
          fetchRoleOptions().catch(() => []),
        ])

        this.areaOptions = areas
        this.roleOptions = roles
        this.rows = await fetchCheckpointRows(roles)
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
