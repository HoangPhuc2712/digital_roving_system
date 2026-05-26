import { defineStore } from 'pinia'
import { fetchAllPagedRows, toApiPage } from '@/utils/pagination'
import {
  fetchPatrolDetailCheckpointOptions,
  fetchReportGuardOptions,
  fetchPointReportRouteFilterOptions,
  fetchReportRows,
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

    areaFilterOptions: [] as { label: string; value: string }[],
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
              r.route_name,
              r.cp_code,
              r.cp_name,
              r.cp_description,
              r.report_name,
              r.pr_note,
            ].join(' ')
          ).toLowerCase()

          if (!haystack.includes(q)) return false
        }

        if (this.filterAreaName != null && r.area_name !== this.filterAreaName) return false
        if (this.filterRouteName != null && r.route_name !== this.filterRouteName) return false
        if (this.filterResult === 'OK' && r.pr_has_problem !== false) return false
        if (this.filterResult === 'NOT_OK' && r.pr_has_problem !== true) return false
        if (this.filterCheckPointName != null && r.cp_name !== this.filterCheckPointName)
          return false
        if (this.filterIssueStatus != null) {
          if (!r.pr_has_problem) return false
          if (r.pr_status !== this.filterIssueStatus) return false
        }
        const guardFilterValue = String(this.filterGuardId ?? '').trim()
        if (guardFilterValue) {
          const selectedGuard = this.guardOptions.find(
            (option) => option.value === this.filterGuardId,
          )
          const guardNameQuery = String(selectedGuard?.label ?? guardFilterValue)
            .trim()
            .toLowerCase()
          const reportName = String(r.report_name ?? '').trim()
          const guardSearchText = String(this.guardSearchTextMap[reportName] ?? reportName)
            .trim()
            .toLowerCase()

          if (!guardSearchText.includes(guardNameQuery)) {
            return false
          }
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
    async ensureRouteFilterOptionsLoaded() {
      if (this.areaFilterOptions.length && this.routeFilterOptions.length) return
      if (this.routeFilterOptionsLoading) return

      this.routeFilterOptionsLoading = true
      try {
        const routeFilters = await fetchPointReportRouteFilterOptions().catch(() => ({
          areaOptions: [] as { label: string; value: string }[],
          routeOptions: [] as {
            label: string
            value: string
            areaName: string
            routeId?: number
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

      const rows = await fetchAllPagedRows((pageParams) =>
        fetchReportRows({
          ...pageParams,
          reportAtFrom: from,
          reportAtTo: to,
          prStatus: this.filterIssueStatus,
          prHasProblem,
          areaName: this.filterAreaName,
          routeId: selectedRoute?.routeId ?? null,
          cpId: selectedCheckPoint?.cpId ?? null,
          cpName: this.filterCheckPointName,
          reportBy: selectedGuard?.userId ?? this.filterGuardId,
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
