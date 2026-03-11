import { defineStore } from 'pinia'
import type { CtpatReportRow } from './reports.types'
import { fetchCtpatReportRows } from './reports.api'

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
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

    first: 0,
    rowsPerPage: 10,
  }),

  getters: {
    areaOptions(): { label: string; value: string }[] {
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
    async load() {
      this.loading = true
      try {
        this.rows = await fetchCtpatReportRows()
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaName = null
      this.filterDateFrom = startOfToday()
      this.filterDateTo = endOfToday()
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
