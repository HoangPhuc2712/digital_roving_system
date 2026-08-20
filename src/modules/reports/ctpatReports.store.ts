import { defineStore } from 'pinia'
import { fetchAllPagedRows, toApiPage } from '@/utils/pagination'
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
    totalRecords: 0,
    areaFilterOptions: [] as { label: string; value: string; areaId?: number }[],
    routeFilterOptions: [] as {
      label: string
      value: string
      areaName: string
      routeId?: number
      areaId?: number
    }[],
    routeFilterOptionsLoading: false,
  }),

  getters: {
    areaOptions(state): { label: string; value: string; areaId?: number }[] {
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

    routeOptions(state): {
      label: string
      value: string
      areaName: string
      routeId?: number
      areaId?: number
      searchText?: string
    }[] {
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
      // API filtering/pagination is authoritative; avoid filtering the current page twice.
      return this.rows.slice()

    },
  },

  actions: {
    async ensureRouteFilterOptionsLoaded() {
      if (this.routeFilterOptionsLoading) return

      this.routeFilterOptionsLoading = true
      try {
        const routeFilters = await fetchCtpatRouteFilterOptions(this.filterAreaName).catch(() => ({
          areaOptions: [] as { label: string; value: string; areaId?: number }[],
          routeOptions: [] as {
            label: string
            value: string
            areaName: string
            routeId?: number
            areaId?: number
            searchText?: string
          }[],
        }))

        this.areaFilterOptions = routeFilters.areaOptions
        this.routeFilterOptions = routeFilters.routeOptions
      } finally {
        this.routeFilterOptionsLoading = false
      }
    },

    async load() {
      this.loading = true
      try {
        const selectedArea = this.areaOptions.find((option) => option.value === this.filterAreaName)
        const selectedRoute = this.routeOptions.find(
          (option) =>
            option.value === this.filterRouteName &&
            (this.filterAreaName == null || option.areaName === this.filterAreaName),
        )

        const result = await fetchCtpatReportRows({
          reportAtFrom: this.filterDateFrom,
          reportAtTo: this.filterDateTo,
          page: toApiPage(this.first, this.rowsPerPage),
          pageSize: this.rowsPerPage,
          areaId: selectedArea?.areaId ?? null,
          routeId: selectedRoute?.routeId ?? null,
          areaName: this.filterAreaName,
          routeName: this.filterRouteName,
        })

        this.rows = result.items
        this.totalRecords = result.totalCount
      } finally {
        this.loading = false
      }
    },

    async getRowsForExport() {
      const selectedArea = this.areaOptions.find((option) => option.value === this.filterAreaName)
      const selectedRoute = this.routeOptions.find(
        (option) =>
          option.value === this.filterRouteName &&
          (this.filterAreaName == null || option.areaName === this.filterAreaName),
      )

      const rows = await fetchAllPagedRows((pageParams) =>
        fetchCtpatReportRows({
          ...pageParams,
          reportAtFrom: this.filterDateFrom,
          reportAtTo: this.filterDateTo,
          areaId: selectedArea?.areaId ?? null,
          routeId: selectedRoute?.routeId ?? null,
          areaName: this.filterAreaName,
          routeName: this.filterRouteName,
        }),
      )

      const currentRows = this.rows
      this.rows = rows
      try {
        return this.filteredRows.slice()
      } finally {
        this.rows = currentRows
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaName = null
      this.filterRouteName = null
      this.filterDateFrom = startOfToday()
      this.filterDateTo = endOfToday()
      this.first = 0
      this.totalRecords = 0
    },

    setFirst(first: number) {
      this.first = first
    },

    setPage(first: number, rowsPerPage: number) {
      this.first = first
      this.rowsPerPage = rowsPerPage
    },
  },
})
