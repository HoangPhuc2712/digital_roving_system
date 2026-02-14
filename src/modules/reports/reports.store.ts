import { defineStore } from 'pinia'
import { fetchReportRows } from './reports.api'
import type { ReportRow } from './reports.types'
import { useAuthStore } from '@/stores/auth.store'

type ResultFilter = 'ALL' | 'OK' | 'NOT_OK'

export const useReportsStore = defineStore('reports', {
  state: () => ({
    rows: [] as ReportRow[],
    loading: false,

    searchText: '' as string,

    filterAreaId: null as number | null,
    filterResult: 'ALL' as ResultFilter,
    filterRoleCode: '' as string,
    filterGuardId: '' as string,
    filterDateRange: null as (Date | null)[] | null,

    first: 0,
    rowsPerPage: 10,
  }),

  getters: {
    visibleRows(state): ReportRow[] {
      const auth = useAuthStore()

      if (auth.canAccess('reports.view_all')) return state.rows

      const uid = auth.user?.user_id ?? ''
      return state.rows.filter((r) => r.created_by === uid)
    },

    areaOptions(): { label: string; value: number }[] {
      const seen = new Map<number, string>()
      for (const r of this.visibleRows) {
        if (!r.area_id) continue
        if (!seen.has(r.area_id)) {
          seen.set(r.area_id, `${r.area_code} - ${r.area_name}`.trim())
        }
      }
      return [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },

    roleOptions(): { label: string; value: string }[] {
      const seen = new Map<string, string>()
      for (const r of this.visibleRows) {
        if (!r.role_code) continue
        if (!seen.has(r.role_code)) {
          seen.set(r.role_code, r.role_name || r.role_code)
        }
      }
      return [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },

    guardOptions(): { label: string; value: string }[] {
      const rf = (this.filterRoleCode ?? '').trim()

      const seen = new Map<string, string>()
      for (const r of this.visibleRows) {
        if (!r.user_id) continue

        if (rf) {
          const codeMatch = r.role_code === rf
          const nameMatch = (r.role_name ?? '') === rf
          if (!codeMatch && !nameMatch) continue
        }

        if (!seen.has(r.user_id)) {
          const label = r.user_name ? `${r.user_name} (${r.user_code})` : r.user_code
          seen.set(r.user_id, label)
        }
      }

      return [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },

    filteredRows(): ReportRow[] {
      const q = this.searchText.trim().toLowerCase()

      const [start, end] = this.filterDateRange ?? [null, null]
      const startTime = start ? startOfDay(start).getTime() : null
      const endTime = end ? endOfDay(end).getTime() : null

      return this.visibleRows.filter((r) => {
        if (q) {
          const haystack = [
            r.area_code,
            r.area_name,
            r.cp_name,
            r.cp_description,
            r.user_code,
            r.user_name,
          ]
            .join(' ')
            .toLowerCase()

          if (!haystack.includes(q)) return false
        }

        if (this.filterAreaId != null && r.area_id !== this.filterAreaId) return false

        if (this.filterResult === 'OK' && r.pr_check !== true) return false
        if (this.filterResult === 'NOT_OK' && r.pr_check !== false) return false

        if (this.filterRoleCode) {
          const rf = this.filterRoleCode.trim()
          const codeMatch = r.role_code === rf
          const nameMatch = (r.role_name ?? '') === rf
          if (!codeMatch && !nameMatch) return false
        }

        if (this.filterGuardId && r.user_id !== this.filterGuardId) return false

        if (startTime != null || endTime != null) {
          const t = new Date(r.created_at).getTime()
          if (startTime != null && t < startTime) return false
          if (endTime != null && t > endTime) return false
        }

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        this.rows = await fetchReportRows()
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaId = null
      this.filterResult = 'ALL'
      this.filterRoleCode = ''
      this.filterGuardId = ''
      this.filterDateRange = null
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },

    deleteLocal(pr_id: number) {
      this.rows = this.rows.filter((r) => r.pr_id !== pr_id)
      if (this.first >= this.filteredRows.length) {
        this.first = 0
      }
    },
  },
})

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
