import { defineStore } from 'pinia'
import type {
  CheckpointRow,
  CheckpointStatusFilter,
  AreaOption,
  RoleOption,
} from './checkpoints.types'
import { fetchAreaOptions, fetchCheckpointRows, fetchRoleOptions } from './checkpoints.api'

export const useCheckpointsStore = defineStore('checkpoints', {
  state: () => ({
    rows: [] as CheckpointRow[],
    loading: false,

    searchText: '' as string,
    filterAreaId: null as number | null,
    filterStatus: 'ALL' as CheckpointStatusFilter,

    areaOptions: [] as AreaOption[],
    roleOptions: [] as RoleOption[],

    first: 0,
    rowsPerPage: 10,
  }),

  getters: {
    filteredRows(state): CheckpointRow[] {
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        if (state.filterAreaId != null && r.area_id !== state.filterAreaId) return false

        if (state.filterStatus === 'ACTIVE' && r.cp_status !== 1) return false
        if (state.filterStatus === 'INACTIVE' && r.cp_status !== 0) return false

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
      this.filterStatus = 'ALL'
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
