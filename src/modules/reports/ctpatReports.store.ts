import { defineStore } from 'pinia'
import type { CtpatReportRow } from './reports.types'
import { fetchCtpatReportRows, fetchCtpatRouteFilterOptions } from './reports.api'

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
    rowsPerPage: 25,
    areaFilterOptions: [] as { label: string; value: string }[],
    routeFilterOptions: [] as { label: string; value: string; areaName: string }[],
    routeFilterOptionsLoading: false,
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

    routeAreaOptions(): { label: string; value: string }[] {
      return this.areaOptions
    },

    routeOptions(state): { label: string; value: string; areaName: string; searchText?: string }[] {
      if (state.routeFilterOptions.length) {
        return state.routeFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label))
      }

      const seen = new Set<string>()
      const options: { label: string; value: string; areaName: string; searchText?: string }[] = []

      for (const row of this.rows) {
        const value = String(row.route_name ?? '').trim()
        const areaName = String(row.area_name ?? '').trim()
        if (!value) continue
        const key = `${areaName}::${value}`
        if (seen.has(key)) continue
        seen.add(key)
        options.push({ label: value, value, areaName, searchText: value.toLowerCase() })
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
    async ensureRouteFilterOptionsLoaded() {
      if (this.areaFilterOptions.length && this.routeFilterOptions.length) return
      if (this.routeFilterOptionsLoading) return

      this.routeFilterOptionsLoading = true
      try {
        const routeFilters = await fetchCtpatRouteFilterOptions().catch(() => ({
          areaOptions: [] as { label: string; value: string }[],
          routeOptions: [] as {
            label: string
            value: string
            areaName: string
            searchText?: string
          }[],
        }))

        if (!this.areaFilterOptions.length) this.areaFilterOptions = routeFilters.areaOptions
        if (!this.routeFilterOptions.length) this.routeFilterOptions = routeFilters.routeOptions
      } finally {
        this.routeFilterOptionsLoading = false
      }
    },

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
