import { defineStore } from 'pinia'
import { fetchRouteRows } from '@/modules/routes/routes.api'
import { fetchRoutesChartShiftNodes } from './reports.api'
import type { RoutesChartRouteCard } from './reports.types'

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

export const useRoutesChartReportsStore = defineStore('routesChartReports', {
  state: () => ({
    rows: [] as RoutesChartRouteCard[],
    loading: false,
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,
  }),

  actions: {
    async load() {
      this.loading = true
      try {
        const from = this.filterDateFrom ?? startOfToday()
        const to = this.filterDateTo ?? endOfToday()

        const [routeRows, shiftNodes] = await Promise.all([
          fetchRouteRows().catch(() => []),
          fetchRoutesChartShiftNodes(from, to).catch(() => []),
        ])

        const sortedRouteRows = routeRows.slice().sort((a, b) => {
          const areaDiff = Number(a.area_id ?? 0) - Number(b.area_id ?? 0)
          if (areaDiff !== 0) return areaDiff

          const priorityDiff = Number(a.route_priority ?? 0) - Number(b.route_priority ?? 0)
          if (priorityDiff !== 0) return priorityDiff

          return String(a.route_code ?? '').localeCompare(String(b.route_code ?? ''))
        })

        this.rows = sortedRouteRows.map((route) => {
          const routeNodes = shiftNodes
            .filter((node) => node.route_id === route.route_id)
            .sort((a, b) => new Date(a.patrol_at).getTime() - new Date(b.patrol_at).getTime())

          const labels = routeNodes.map((node) => String(node.patrol_label ?? '').trim())
          const values = routeNodes.map((node) => Number(node.reality_minute ?? 0))
          const averageMinute =
            values.length > 0
              ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
              : null

          return {
            route_id: route.route_id,
            route_code: route.route_code,
            route_name: route.route_name,
            route_min_minute: Number(route.route_min_minute ?? 0),
            route_max_minute: Number(route.route_max_minute ?? 0),
            labels,
            values,
            tooltip_titles: labels,
            average_minute: averageMinute,
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
