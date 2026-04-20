import { defineStore } from 'pinia'
import {
  fetchGpsLogRows,
  fetchPatrolDetailCheckpointOptions,
  fetchPatrolDetailGuardOptions,
  fetchReportRouteFilterOptions,
} from './reports.api'
import type { GpsLogRow } from './reports.types'

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

export const useGpsLogReportsStore = defineStore('gpsLogReports', {
  state: () => ({
    rows: [] as GpsLogRow[],
    loading: false,

    searchText: '' as string,
    filterAreaId: null as number | null,
    filterRouteName: null as string | null,
    filterCheckPointName: null as string | null,
    filterGuardName: null as string | null,
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

    areaFilterOptions: [] as { label: string; value: number }[],
    routeFilterOptions: [] as { label: string; value: string; areaId: number }[],
    checkPointFilterOptions: [] as { label: string; value: string; searchText?: string }[],
    guardFilterOptions: [] as { label: string; value: string; searchText?: string }[],

    routeFilterOptionsLoading: false,
    checkPointFilterOptionsLoading: false,
    guardFilterOptionsLoading: false,

    first: 0,
    rowsPerPage: 25,
  }),

  getters: {
    areaOptions(state): { label: string; value: number }[] {
      if (state.areaFilterOptions.length) return state.areaFilterOptions

      const seen = new Set<number>()
      const options: { label: string; value: number }[] = []

      for (const row of this.rows) {
        const value = Number(row.area_id ?? 0)
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({
          value,
          label: `Area ${value}`,
        })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    routeAreaOptions(): { label: string; value: number }[] {
      return this.areaOptions
    },

    routeOptions(state): { label: string; value: string; areaId: number; searchText?: string }[] {
      if (state.routeFilterOptions.length) {
        return state.routeFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label))
      }

      const seen = new Set<string>()
      const options: { label: string; value: string; areaId: number; searchText?: string }[] = []

      for (const row of this.rows) {
        const value = String(row.route_name ?? '').trim()
        const areaId = Number(row.area_id ?? 0)
        if (!value) continue
        const key = `${areaId}::${value}`
        if (seen.has(key)) continue
        seen.add(key)
        options.push({ label: value, value, areaId, searchText: value.toLowerCase() })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    checkPointOptions(state): { label: string; value: string; searchText?: string }[] {
      if (state.checkPointFilterOptions.length) return state.checkPointFilterOptions

      const seen = new Set<string>()
      const options: { label: string; value: string; searchText?: string }[] = []

      for (const row of this.rows) {
        const value = String(row.check_point_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({
          label: value,
          value,
          searchText: String(value).toLowerCase().trim(),
        })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    guardOptions(state): { label: string; value: string; searchText?: string }[] {
      if (state.guardFilterOptions.length) return state.guardFilterOptions

      const seen = new Set<string>()
      const options: { label: string; value: string; searchText?: string }[] = []

      for (const row of this.rows) {
        const value = String(row.report_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({
          label: value,
          value,
          searchText: String(value).toLowerCase().trim(),
        })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    guardSearchTextMap(): Record<string, string> {
      const map: Record<string, string> = {}
      for (const option of this.guardOptions) {
        const label = String(option.label ?? '').trim()
        const value = String(option.value ?? '').trim()
        const searchText = String(option.searchText ?? label)
          .trim()
          .toLowerCase()

        if (label && !map[label]) map[label] = searchText
        if (value && !map[value]) map[value] = searchText
      }
      return map
    },

    filteredRows(): GpsLogRow[] {
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
        if (this.filterAreaId != null && row.area_id !== this.filterAreaId) return false
        if (this.filterRouteName != null && row.route_name !== this.filterRouteName) return false
        if (this.filterCheckPointName != null && row.check_point_name !== this.filterCheckPointName)
          return false

        const guardNameQuery = String(this.filterGuardName ?? '')
          .trim()
          .toLowerCase()
        if (guardNameQuery) {
          const reportName = String(row.report_name ?? '').trim()
          const guardSearchText = String(this.guardSearchTextMap[reportName] ?? reportName)
            .trim()
            .toLowerCase()

          if (!guardSearchText.includes(guardNameQuery)) {
            return false
          }
        }

        if (fromTime != null || toTime != null) {
          const t = new Date(row.patrol_time || row.start_time || row.finish_time).getTime()
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
        const routeFilters = await fetchReportRouteFilterOptions().catch(() => ({
          areaOptions: [] as { label: string; value: number }[],
          routeOptions: [] as {
            label: string
            value: string
            areaId: number
            searchText?: string
          }[],
        }))

        if (!this.areaFilterOptions.length) this.areaFilterOptions = routeFilters.areaOptions
        if (!this.routeFilterOptions.length) this.routeFilterOptions = routeFilters.routeOptions
      } finally {
        this.routeFilterOptionsLoading = false
      }
    },

    async ensureCheckPointFilterOptionsLoaded() {
      if (this.checkPointFilterOptions.length) return
      if (this.checkPointFilterOptionsLoading) return

      this.checkPointFilterOptionsLoading = true
      try {
        this.checkPointFilterOptions = await fetchPatrolDetailCheckpointOptions().catch(() => [])
      } finally {
        this.checkPointFilterOptionsLoading = false
      }
    },

    async ensureGuardFilterOptionsLoaded() {
      if (this.guardFilterOptions.length) return
      if (this.guardFilterOptionsLoading) return

      this.guardFilterOptionsLoading = true
      try {
        this.guardFilterOptions = await fetchPatrolDetailGuardOptions().catch(() => [])
      } finally {
        this.guardFilterOptionsLoading = false
      }
    },

    async load() {
      this.loading = true
      try {
        this.rows = await fetchGpsLogRows(this.filterDateFrom, this.filterDateTo)
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaId = null
      this.filterRouteName = null
      this.filterCheckPointName = null
      this.filterGuardName = null
      this.filterDateFrom = startOfToday()
      this.filterDateTo = endOfToday()
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
