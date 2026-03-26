import { defineStore } from 'pinia'
import type { CtpatReportRow } from './reports.types'
import { fetchCtpatAreaOptions, fetchCtpatReportRows } from './reports.api'

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

export const useCtpatReportsStore = defineStore('ctpatReports', {
  state: () => ({
    rows: [] as CtpatReportRow[],
    loading: false,

    searchText: '' as string,
    filterAreaName: null as string | null,
    filterRouteName: null as string | null,
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

    first: 0,
    rowsPerPage: 10,
    areaFilterOptions: [] as { label: string; value: string }[],
  }),

  getters: {
    areaOptions(state): { label: string; value: string }[] {
      if (state.areaFilterOptions.length) return state.areaFilterOptions

      const seen = new Set<string>()
      const options: { label: string; value: string }[] = []

      for (const row of this.rows) {
        const value = String(row.area_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({ label: value, value })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    routeOptions(): { label: string; value: string }[] {
      const seen = new Set<string>()
      const options: { label: string; value: string }[] = []

      for (const row of this.rows) {
        const value = String(row.route_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({ label: value, value })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    filteredRows(): CtpatReportRow[] {
      const q = this.searchText.trim().toLowerCase()
      let fromTime = this.filterDateFrom ? this.filterDateFrom.getTime() : null
      let toTime = this.filterDateTo ? this.filterDateTo.getTime() : null

      if (fromTime != null && toTime != null && fromTime > toTime) {
        const tmp = fromTime
        fromTime = toTime
        toTime = tmp
      }

      return this.rows.filter((row) => {
        if (q && !row._q.includes(q)) return false

        if (this.filterAreaName != null && row.area_name !== this.filterAreaName) return false
        if (this.filterRouteName != null && row.route_name !== this.filterRouteName) return false

        if (fromTime != null || toTime != null) {
          const t = new Date(row.scan_at || row.start_at || row.end_at).getTime()
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
      if (this.areaFilterOptions.length) return
      this.areaFilterOptions = await fetchCtpatAreaOptions().catch(() => [])
    },

    async load() {
      this.loading = true
      try {
        const [rows] = await Promise.all([fetchCtpatReportRows(), this.ensureFilterOptionsLoaded()])
        this.rows = rows
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaName = null
      this.filterRouteName = null
      this.filterDateFrom = startOfToday()
      this.filterDateTo = endOfToday()
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
