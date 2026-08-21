import { defineStore } from 'pinia'
import { toApiPage } from '@/utils/pagination'
import {
  fetchPatrolDetailCheckpointOptions,
  fetchReportGuardOptions,
  fetchPointReportRouteFilterOptions,
  fetchReportRows,
  fetchReportRowsForExport,
} from './reports.api'
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
    totalRecords: 0,
    loading: false,

    searchText: '' as string,

    filterAreaName: null as string | null,
    filterRouteName: null as string | null,
    filterResult: 'ALL' as ResultFilter,
    filterIssueStatus: null as number | null,
    filterCheckPointName: null as string | null,
    filterGuardId: '' as string,
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

    first: 0,
    rowsPerPage: 25,

    areaFilterOptions: [] as { label: string; value: string; areaId?: number }[],
    routeFilterOptions: [] as {
      label: string
      value: string
      areaName: string
      routeId?: number
    }[],
    checkPointFilterOptions: [] as {
      label: string
      value: string
      cpId?: number
      searchText?: string
    }[],
    guardFilterOptions: [] as {
      label: string
      value: string
      userId?: string
      searchText?: string
    }[],

    routeFilterOptionsLoading: false,
    checkPointFilterOptionsLoading: false,
    guardFilterOptionsLoading: false,
  }),

  getters: {
    visibleRows(state): ReportRow[] {
      return state.rows
    },

    areaOptions(state): { label: string; value: string }[] {
      if (state.areaFilterOptions.length) return state.areaFilterOptions

      const seen = new Set<string>()
      const options: { label: string; value: string }[] = []
      for (const r of this.visibleRows) {
        const value = String(r.area_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({ value, label: value })
      }
      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    routeAreaOptions(): { label: string; value: string }[] {
      return this.areaOptions
    },

    routeOptions(
      state,
    ): { label: string; value: string; areaName: string; routeId?: number; searchText?: string }[] {
      if (state.routeFilterOptions.length) {
        return state.routeFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label))
      }

      const seen = new Set<string>()
      const options: {
        label: string
        value: string
        areaName: string
        routeId?: number
        searchText?: string
      }[] = []

      for (const r of this.visibleRows) {
        const value = String(r.route_name ?? '').trim()
        const areaName = String(r.area_name ?? '').trim()
        if (!value) continue
        const key = `${areaName}::${value}`
        if (seen.has(key)) continue
        seen.add(key)
        options.push({ label: value, value, areaName, searchText: value.toLowerCase() })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    guardOptions(state): { label: string; value: string; userId?: string; searchText?: string }[] {
      if (state.guardFilterOptions.length) return state.guardFilterOptions

      const seen = new Map<string, string>()

      for (const r of this.visibleRows) {
        const label = String(r.report_name ?? '').trim()
        const value = String(r.created_by ?? '').trim() || label

        if (!label || !value) continue
        if (!seen.has(value)) seen.set(value, label)
      }

      return [...seen.entries()]
        .map(([value, label]) => ({
          value,
          label,
          searchText: String(label).toLowerCase().trim(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
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

    checkPointOptions(
      state,
    ): { label: string; value: string; cpId?: number; searchText?: string }[] {
      if (state.checkPointFilterOptions.length) return state.checkPointFilterOptions

      const seen = new Set<string>()
      const options: { label: string; value: string; searchText?: string }[] = []

      for (const r of this.visibleRows) {
        const value = String(r.cp_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({
          label: value,
          value,
          searchText: String(r.cp_name ?? '')
            .toLowerCase()
            .trim(),
        })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    filteredRows(): ReportRow[] {
      // API filtering/pagination is authoritative; avoid re-filtering the current page locally.
      return this.visibleRows.slice()

    },
  },

  actions: {
    async ensureRouteFilterOptionsLoaded() {
      if (this.routeFilterOptionsLoading) return

      this.routeFilterOptionsLoading = true
      try {
        const routeFilters = await fetchPointReportRouteFilterOptions(this.filterAreaName).catch(() => ({
          areaOptions: [] as { label: string; value: string; areaId?: number }[],
          routeOptions: [] as {
            label: string
            value: string
            areaName: string
            routeId?: number
            searchText?: string
          }[],
        }))

        this.areaFilterOptions = routeFilters.areaOptions
        this.routeFilterOptions = routeFilters.routeOptions
      } finally {
        this.routeFilterOptionsLoading = false
      }
    },

    async ensureCheckPointFilterOptionsLoaded() {
      if (this.checkPointFilterOptionsLoading) return

      this.checkPointFilterOptionsLoading = true
      try {
        const selectedArea = this.areaFilterOptions.find(
          (option) => option.value === this.filterAreaName,
        )
        this.checkPointFilterOptions = await fetchPatrolDetailCheckpointOptions({
          areaId: selectedArea?.areaId ?? null,
        }).catch(() => [])
      } finally {
        this.checkPointFilterOptionsLoading = false
      }
    },

    async ensureGuardFilterOptionsLoaded() {
      if (this.guardFilterOptionsLoading) return

      this.guardFilterOptionsLoading = true
      try {
        this.guardFilterOptions = await fetchReportGuardOptions().catch(() => [])
      } finally {
        this.guardFilterOptionsLoading = false
      }
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

        const effectiveResult = this.filterIssueStatus != null ? 'NOT_OK' : this.filterResult
        const prHasProblem =
          effectiveResult === 'OK' ? false : effectiveResult === 'NOT_OK' ? true : null

        const selectedRoute = this.routeOptions.find(
          (option) =>
            option.value === this.filterRouteName &&
            (this.filterAreaName == null || option.areaName === this.filterAreaName),
        )
        const selectedCheckPoint = this.checkPointOptions.find(
          (option) => option.value === this.filterCheckPointName,
        )
        const selectedGuard = this.guardOptions.find(
          (option) => option.value === this.filterGuardId,
        )

        const result = await fetchReportRows({
          page: toApiPage(this.first, this.rowsPerPage),
          pageSize: this.rowsPerPage,
          reportAtFrom: from,
          reportAtTo: to,
          prStatus: this.filterIssueStatus,
          prHasProblem,
          areaName: this.filterAreaName,
          routeId: selectedRoute?.routeId ?? null,
          cpId: selectedCheckPoint?.cpId ?? null,
          cpName: this.filterCheckPointName,
          reportBy: selectedGuard?.userId ?? this.filterGuardId,
        })

        this.rows = result.items
        this.totalRecords = result.totalCount
      } finally {
        this.loading = false
      }
    },

    async getRowsForExport() {
      let from = this.filterDateFrom ? new Date(this.filterDateFrom) : null
      let to = this.filterDateTo ? new Date(this.filterDateTo) : null

      if (from && to && from.getTime() > to.getTime()) {
        const tmp = from
        from = to
        to = tmp
      }

      const effectiveResult = this.filterIssueStatus != null ? 'NOT_OK' : this.filterResult
      const prHasProblem =
        effectiveResult === 'OK' ? false : effectiveResult === 'NOT_OK' ? true : null

      const selectedRoute = this.routeOptions.find(
        (option) =>
          option.value === this.filterRouteName &&
          (this.filterAreaName == null || option.areaName === this.filterAreaName),
      )
      const selectedCheckPoint = this.checkPointOptions.find(
        (option) => option.value === this.filterCheckPointName,
      )
      const selectedGuard = this.guardOptions.find((option) => option.value === this.filterGuardId)

      // Export uses /pointreportview/getlist once, without page/pageSize, and keeps backend order.
      return fetchReportRowsForExport({
        reportAtFrom: from,
        reportAtTo: to,
        prStatus: this.filterIssueStatus,
        prHasProblem,
        areaName: this.filterAreaName,
        routeId: selectedRoute?.routeId ?? null,
        cpId: selectedCheckPoint?.cpId ?? null,
        cpName: this.filterCheckPointName,
        reportBy: selectedGuard?.userId ?? this.filterGuardId,
      })
    },

    clearFilters() {
      this.searchText = ''
      this.filterAreaName = null
      this.filterRouteName = null
      this.filterResult = 'ALL'
      this.filterIssueStatus = null
      this.filterCheckPointName = null
      this.filterGuardId = ''
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

    deleteLocal(pr_id: number) {
      this.rows = this.rows.filter((r) => r.pr_id !== pr_id)
      if (this.first >= this.filteredRows.length) {
        this.first = 0
      }
    },
  },
})
