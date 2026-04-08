import { defineStore } from 'pinia'
import {
  fetchPatrolDetailCheckpointOptions,
  fetchReportAreaOptions,
  fetchReportGuardOptions,
  fetchReportRouteFilterOptions,
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
    loading: false,

    searchText: '' as string,

    filterAreaId: null as number | null,
    filterRouteName: null as string | null,
    filterResult: 'ALL' as ResultFilter,
    filterIssueStatus: null as number | null,
    filterCheckPointName: null as string | null,
    filterGuardId: '' as string,
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

    first: 0,
    rowsPerPage: 25,

    areaFilterOptions: [] as { label: string; value: number }[],
    routeFilterOptions: [] as { label: string; value: string; areaId: number }[],
    checkPointFilterOptions: [] as { label: string; value: string; searchText?: string }[],
    guardFilterOptions: [] as { label: string; value: string; searchText?: string }[],
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

    routeAreaOptions(): { label: string; value: number }[] {
      return this.areaOptions
    },

    routeOptions(state): { label: string; value: string; areaId: number; searchText?: string }[] {
      if (state.routeFilterOptions.length) {
        return state.routeFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label))
      }

      const seen = new Set<string>()
      const options: { label: string; value: string; areaId: number; searchText?: string }[] = []

      for (const r of this.visibleRows) {
        const value = String(r.route_name ?? '').trim()
        const areaId = Number(r.area_id ?? 0)
        if (!value) continue
        const key = `${areaId}::${value}`
        if (seen.has(key)) continue
        seen.add(key)
        options.push({ label: value, value, areaId, searchText: value.toLowerCase() })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    guardOptions(state): { label: string; value: string; searchText?: string }[] {
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

    checkPointOptions(state): { label: string; value: string; searchText?: string }[] {
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

        if (this.filterAreaId != null && r.area_id !== this.filterAreaId) return false
        if (this.filterRouteName != null && r.route_name !== this.filterRouteName) return false
        if (this.filterResult === 'OK' && r.pr_has_problem !== false) return false
        if (this.filterResult === 'NOT_OK' && r.pr_has_problem !== true) return false
        if (this.filterCheckPointName != null && r.cp_name !== this.filterCheckPointName)
          return false
        if (this.filterIssueStatus != null) {
          if (!r.pr_has_problem) return false
          if (r.pr_status !== this.filterIssueStatus) return false
        }
        const guardNameQuery = String(this.filterGuardId ?? '')
          .trim()
          .toLowerCase()
        if (guardNameQuery) {
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
    async ensureFilterOptionsLoaded() {
      if (
        this.areaFilterOptions.length &&
        this.routeFilterOptions.length &&
        this.checkPointFilterOptions.length &&
        this.guardFilterOptions.length
      )
        return

      const [routeFilters, checkpoints, guards] = await Promise.all([
        this.areaFilterOptions.length && this.routeFilterOptions.length
          ? Promise.resolve({
              areaOptions: this.areaFilterOptions,
              routeOptions: this.routeFilterOptions,
            })
          : fetchReportRouteFilterOptions().catch(async () => ({
              areaOptions: await fetchReportAreaOptions().catch(() => []),
              routeOptions: [] as {
                label: string
                value: string
                areaId: number
                searchText?: string
              }[],
            })),
        this.checkPointFilterOptions.length
          ? Promise.resolve(this.checkPointFilterOptions)
          : fetchPatrolDetailCheckpointOptions().catch(() => []),
        this.guardFilterOptions.length
          ? Promise.resolve(this.guardFilterOptions)
          : fetchReportGuardOptions().catch(() => []),
      ])

      if (!this.areaFilterOptions.length) this.areaFilterOptions = routeFilters.areaOptions
      if (!this.routeFilterOptions.length) this.routeFilterOptions = routeFilters.routeOptions
      if (!this.checkPointFilterOptions.length) this.checkPointFilterOptions = checkpoints
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
      this.filterRouteName = null
      this.filterResult = 'ALL'
      this.filterIssueStatus = null
      this.filterCheckPointName = null
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
