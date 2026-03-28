import { defineStore } from 'pinia'
import { fetchAreaRows } from '@/modules/areas/areas.api'
import {
  fetchPatrolDetailCheckpointOptions,
  fetchPatrolDetailGuardOptions,
  fetchPatrolDetailReportRows,
  fetchReportRouteFilterOptions,
} from './reports.api'
import type { PatrolDetailReportRow } from './reports.types'

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

export const usePatrolDetailReportsStore = defineStore('patrolDetailReports', {
  state: () => ({
    rows: [] as PatrolDetailReportRow[],
    loading: false,

    searchText: '' as string,
    filterAreaId: null as number | null,
    filterRouteName: null as string | null,
    filterCheckPointName: null as string | null,
    filterGuardName: null as string | null,
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

    areaLabelMap: {} as Record<number, string>,
    areaFilterOptions: [] as { label: string; value: number }[],
    routeFilterOptions: [] as { label: string; value: string; areaId: number }[],
    checkPointFilterOptions: [] as { label: string; value: string }[],
    guardFilterOptions: [] as { label: string; value: string }[],

    first: 0,
    rowsPerPage: 10,
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
          label: this.areaLabelMap[value] || `Area ${value}`,
        })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    routeAreaOptions(): { label: string; value: number }[] {
      return this.areaOptions
    },

    routeOptions(state): { label: string; value: string; areaId: number }[] {
      if (state.routeFilterOptions.length) {
        return state.routeFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label))
      }

      const seen = new Set<string>()
      const options: { label: string; value: string; areaId: number }[] = []

      for (const row of this.rows) {
        const value = String(row.route_name ?? '').trim()
        const areaId = Number(row.area_id ?? 0)
        if (!value) continue
        const key = `${areaId}::${value}`
        if (seen.has(key)) continue
        seen.add(key)
        options.push({ label: value, value, areaId })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    checkPointOptions(state): { label: string; value: string }[] {
      if (state.checkPointFilterOptions.length) return state.checkPointFilterOptions

      const seen = new Set<string>()
      const options: { label: string; value: string }[] = []

      for (const row of this.rows) {
        const value = String(row.check_point_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({ label: value, value })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    guardOptions(state): { label: string; value: string }[] {
      if (state.guardFilterOptions.length) return state.guardFilterOptions

      const seen = new Set<string>()
      const options: { label: string; value: string }[] = []

      for (const row of this.rows) {
        const value = String(row.report_name ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        options.push({ label: value, value })
      }

      return options.sort((a, b) => a.label.localeCompare(b.label))
    },

    filteredRows(): PatrolDetailReportRow[] {
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
        if (this.filterGuardName != null && row.report_name !== this.filterGuardName) return false

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
    async ensureFilterOptionsLoaded() {
      if (
        this.areaFilterOptions.length &&
        this.routeFilterOptions.length &&
        this.checkPointFilterOptions.length &&
        this.guardFilterOptions.length
      ) {
        return
      }

      const [routeFilters, checkpoints, guards] = await Promise.all([
        this.areaFilterOptions.length && this.routeFilterOptions.length
          ? Promise.resolve({
              areaOptions: this.areaFilterOptions,
              routeOptions: this.routeFilterOptions,
            })
          : fetchReportRouteFilterOptions().catch(() => ({
              areaOptions: [] as { label: string; value: number }[],
              routeOptions: [] as { label: string; value: string; areaId: number }[],
            })),
        this.checkPointFilterOptions.length
          ? Promise.resolve(this.checkPointFilterOptions)
          : fetchPatrolDetailCheckpointOptions().catch(() => []),
        this.guardFilterOptions.length
          ? Promise.resolve(this.guardFilterOptions)
          : fetchPatrolDetailGuardOptions().catch(() => []),
      ])

      if (!this.areaFilterOptions.length) this.areaFilterOptions = routeFilters.areaOptions
      if (!this.routeFilterOptions.length) this.routeFilterOptions = routeFilters.routeOptions
      if (!this.checkPointFilterOptions.length) this.checkPointFilterOptions = checkpoints
      if (!this.guardFilterOptions.length) this.guardFilterOptions = guards
    },

    async load() {
      this.loading = true
      try {
        const [rows, areaRows] = await Promise.all([
          fetchPatrolDetailReportRows(),
          fetchAreaRows().catch(() => []),
          this.ensureFilterOptionsLoaded(),
        ])

        this.rows = rows
        this.areaLabelMap = Object.fromEntries(
          (areaRows ?? []).map((row: any) => [
            Number(row.area_id ?? 0),
            String(row.area_name ?? row.area_code ?? ''),
          ]),
        )
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
