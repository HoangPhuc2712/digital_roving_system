import { defineStore } from 'pinia'
import { fetchPatrolSummaryRows, fetchReportRouteFilterOptions } from './reports.api'
import type { PatrolSummaryReportRow } from './reports.types'

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

type PatrolSummaryChartDataset = {
  label: string
  data: number[]
}

export const usePatrolSummaryReportsStore = defineStore('patrolSummaryReports', {
  state: () => ({
    rows: [] as PatrolSummaryReportRow[],
    loading: false,

    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

    areaLabelMap: {} as Record<number, string>,
  }),

  getters: {
    groupedRows(
      state,
    ): Array<{ date_key: string; date_label: string; items: PatrolSummaryReportRow[] }> {
      const map = new Map<string, PatrolSummaryReportRow[]>()

      for (const row of state.rows) {
        const key = row.date_key
        const current = map.get(key) ?? []
        current.push(row)
        map.set(key, current)
      }

      return [...map.entries()].map(([dateKey, items]) => ({
        date_key: dateKey,
        date_label: items[0]?.date_label ?? dateKey,
        items,
      }))
    },

    chartLabels(state): string[] {
      return [...new Set(state.rows.map((row) => row.date_label))]
    },

    chartDatasets(state): PatrolSummaryChartDataset[] {
      const labels = [...new Set(state.rows.map((row) => row.date_label))]
      const areaMap = new Map<number, string>()

      for (const row of state.rows) {
        if (!row.area_id) continue
        if (!areaMap.has(row.area_id)) {
          areaMap.set(row.area_id, row.area_name || `Area ${row.area_id}`)
        }
      }

      return [...areaMap.entries()].map(([areaId, label]) => ({
        label,
        data: labels.map((dateLabel) => {
          const row = state.rows.find(
            (item) => item.area_id === areaId && item.date_label === dateLabel,
          )
          return Number(row?.abnormal_rate ?? 0)
        }),
      }))
    },
  },

  actions: {
    async ensureAreaLabelMapLoaded() {
      if (Object.keys(this.areaLabelMap).length) return

      const routeFilters = await fetchReportRouteFilterOptions().catch(() => ({
        areaOptions: [] as { label: string; value: number }[],
        routeOptions: [] as { label: string; value: string; areaId: number; searchText?: string }[],
      }))

      this.areaLabelMap = Object.fromEntries(
        (routeFilters.areaOptions ?? []).map((option) => [
          Number(option.value ?? 0),
          String(option.label ?? ''),
        ]),
      )
    },

    async load() {
      this.loading = true
      try {
        const from = this.filterDateFrom ?? startOfToday()
        const to = this.filterDateTo ?? endOfToday()

        const [rows] = await Promise.all([
          fetchPatrolSummaryRows(from, to),
          this.ensureAreaLabelMapLoaded(),
        ])

        this.rows = rows.map((row) => {
          const resolvedAreaName =
            this.areaLabelMap[row.area_id] || row.area_name || `Area ${row.area_id}`

          return {
            ...row,
            area_name: resolvedAreaName,
            insufficient_patrol_details: (row.insufficient_patrol_details ?? []).map((detail) => ({
              ...detail,
              area_name: resolvedAreaName,
            })),
          }
        })
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.filterDateFrom = startOfToday()
      this.filterDateTo = endOfToday()
    },
  },
})
