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

    // Issue Status filter (pr_status). null = All
    filterIssueStatus: null as number | null,

    // Guard filter (value = created_by userId)
    filterGuardId: '' as string,

    filterMultiDays: false as boolean,
    filterDate: null as Date | null,
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
        if (!guardId) continue
        if (!seen.has(guardId)) {
          const label = (r.created_name ?? '').trim() || guardId
          seen.set(guardId, label)
        }
      }

      return [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },

    filteredRows(): ReportRow[] {
      const q = this.searchText.trim().toLowerCase()

      let start: Date | null = null
      let end: Date | null = null

      if (this.filterMultiDays) {
        start = this.filterDateRange?.[0] ?? null
        end = this.filterDateRange?.[1] ?? null
        if (start && !end) end = start
      } else {
        start = this.filterDate ?? null
        end = this.filterDate ?? null
      }

      const startTime = start ? startOfDay(start).getTime() : null
      const endTime = end ? endOfDay(end).getTime() : null

      return this.visibleRows.filter((r) => {
        // search
        if (q) {
          const haystack = (
            r._q ||
            [
              r.area_code,
              r.area_name,
              r.cp_code,
              r.cp_name,
              r.cp_description,
              r.created_name,
              r.pr_note,
            ].join(' ')
          ).toLowerCase()

          if (!haystack.includes(q)) return false
        }

        // area
        if (this.filterAreaId != null && r.area_id !== this.filterAreaId) return false

        // inspection result
        if (this.filterResult === 'OK' && r.pr_has_problem !== false) return false
        if (this.filterResult === 'NOT_OK' && r.pr_has_problem !== true) return false

        // issue status
        if (this.filterIssueStatus != null && r.pr_status !== this.filterIssueStatus) return false

        // guard
        if (this.filterGuardId && (r.created_by ?? '') !== this.filterGuardId) return false

        // date (ưu tiên scan_at, fallback created_at)
        if (startTime != null || endTime != null) {
          const t = new Date(r.scan_at || r.created_at).getTime()
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
      this.filterIssueStatus = null
      this.filterGuardId = ''
      this.filterMultiDays = false
      this.filterDate = null
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
