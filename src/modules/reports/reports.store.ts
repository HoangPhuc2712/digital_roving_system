import { defineStore } from 'pinia'
import { fetchReportAreaOptions, fetchReportGuardOptions, fetchReportRows } from './reports.api'
import type { ReportRow, ResultFilter } from './reports.types'

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

    areaFilterOptions: [] as { label: string; value: number }[],
    guardFilterOptions: [] as { label: string; value: string }[],
  }),

  getters: {
    visibleRows(state): ReportRow[] {
      return state.rows
    },

    areaOptions(state): { label: string; value: number }[] {
      if (state.areaFilterOptions.length) return state.areaFilterOptions

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

    guardOptions(state): { label: string; value: string }[] {
      if (state.guardFilterOptions.length) return state.guardFilterOptions

      const seen = new Map<string, string>()

      for (const r of this.visibleRows) {
        const label = String(r.report_name ?? '').trim()
        const value = String(r.created_by ?? '').trim() || label

        if (!label || !value) continue
        if (!seen.has(value)) seen.set(value, label)
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
        if (this.filterGuardId) {
          const guardValue = String(r.created_by ?? '').trim() || String(r.report_name ?? '').trim()
          if (guardValue !== this.filterGuardId) return false
        }

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
    async ensureFilterOptionsLoaded() {
      if (this.areaFilterOptions.length && this.guardFilterOptions.length) return

      const [areas, guards] = await Promise.all([
        this.areaFilterOptions.length
          ? Promise.resolve(this.areaFilterOptions)
          : fetchReportAreaOptions().catch(() => []),
        this.guardFilterOptions.length
          ? Promise.resolve(this.guardFilterOptions)
          : fetchReportGuardOptions().catch(() => []),
      ])

      if (!this.areaFilterOptions.length) this.areaFilterOptions = areas
      if (!this.guardFilterOptions.length) this.guardFilterOptions = guards
    },

    async load() {
      this.loading = true
      try {
        let from = this.filterDateFrom ? new Date(this.filterDateFrom) : null
        let to = this.filterDateTo ? new Date(this.filterDateTo) : null

        if (from && to && from.getTime() > to.getTime()) {
          const tmp = from
          from = to
          to = tmp
        }

        const [rows] = await Promise.all([
          fetchReportRows({
            reportAtFrom: from,
            reportAtTo: to,
          }),
          this.ensureFilterOptionsLoaded(),
        ])

        this.rows = rows
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
