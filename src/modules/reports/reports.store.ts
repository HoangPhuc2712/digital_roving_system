import { defineStore } from 'pinia'
import { fetchReportRows } from './reports.api'
import type { ReportRow, ResultFilter } from './reports.types'
import { useAuthStore } from '@/stores/auth.store'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export const useReportsStore = defineStore('reports', {
  state: () => ({
    rows: [] as ReportRow[],
    loading: false,

    searchText: '' as string,

    filterAreaId: null as number | null,
    filterResult: 'ALL' as ResultFilter,
    filterIssueStatus: null as number | null,
    filterGuardId: '' as string,
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

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
          const label = `${r.area_code} - ${r.area_name}`.trim()
          seen.set(r.area_id, label)
        }
      }
      return [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },

    guardOptions(): { label: string; value: string }[] {
      const seen = new Map<string, string>()
      for (const r of this.visibleRows) {
        const guardId = (r.created_by ?? '').trim()
        const label = (r.report_name ?? '').trim()
        if (!guardId || !label) continue
        if (!seen.has(guardId)) seen.set(guardId, label)
      }

      return [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },

    filteredRows(): ReportRow[] {
      const q = this.searchText.trim().toLowerCase()
      let fromTime = this.filterDateFrom ? this.filterDateFrom.getTime() : null
      let toTime = this.filterDateTo ? this.filterDateTo.getTime() : null

      if (fromTime != null && toTime != null && fromTime > toTime) {
        const tmp = fromTime
        fromTime = toTime
        toTime = tmp
      }

      return this.visibleRows.filter((r) => {
        if (q) {
          const haystack = (
            r._q ||
            [
              r.area_code,
              r.area_name,
              r.cp_code,
              r.cp_name,
              r.cp_description,
              r.report_name,
              r.pr_note,
            ].join(' ')
          ).toLowerCase()

          if (!haystack.includes(q)) return false
        }

        if (this.filterAreaId != null && r.area_id !== this.filterAreaId) return false
        if (this.filterResult === 'OK' && r.pr_has_problem !== false) return false
        if (this.filterResult === 'NOT_OK' && r.pr_has_problem !== true) return false
        if (this.filterIssueStatus != null) {
          if (!r.pr_has_problem) return false
          if (r.pr_status !== this.filterIssueStatus) return false
        }
        if (this.filterGuardId && (r.created_by ?? '') !== this.filterGuardId) return false

        if (fromTime != null || toTime != null) {
          const t = new Date(r.report_at || r.scan_at || r.created_at).getTime()
          if (!Number.isFinite(t)) return false
          if (fromTime != null && t < fromTime) return false
          if (toTime != null && t > toTime) return false
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
      this.filterIssueStatus = null
      this.filterGuardId = ''
      this.filterDateFrom = startOfToday()
      this.filterDateTo = endOfToday()
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
