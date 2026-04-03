import { defineStore } from 'pinia'
import { fetchIncorrectScanLogRows } from './reports.api'
import type { IncorrectScanLogRow } from './reports.types'

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

export const useIncorrectScanLogStore = defineStore('incorrectScanLog', {
  state: () => ({
    rows: [] as IncorrectScanLogRow[],
    loading: false,

    searchText: '' as string,
    filterDateFrom: startOfToday() as Date | null,
    filterDateTo: endOfToday() as Date | null,

    first: 0,
    rowsPerPage: 25,
  }),

  getters: {
    filteredRows(): IncorrectScanLogRow[] {
      const q = this.searchText.trim().toLowerCase()
      let fromTime = this.filterDateFrom ? this.filterDateFrom.getTime() : null
      let toTime = this.filterDateTo ? this.filterDateTo.getTime() : null

      if (fromTime != null && toTime != null && fromTime > toTime) {
        const tmp = fromTime
        fromTime = toTime
        toTime = tmp
      }

      return this.rows.filter((row) => {
        if (q && !String(row._q ?? '').includes(q)) return false

        if (fromTime != null || toTime != null) {
          const t = new Date(row.created_at || row.ps_start_at || row.ps_end_at).getTime()
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
        let from = this.filterDateFrom ? new Date(this.filterDateFrom) : null
        let to = this.filterDateTo ? new Date(this.filterDateTo) : null

        if (from && to && from.getTime() > to.getTime()) {
          const tmp = from
          from = to
          to = tmp
        }

        const rows = await fetchIncorrectScanLogRows({
          createdAtFrom: from,
          createdAtTo: to,
        })

        this.rows = rows
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterDateFrom = startOfToday()
      this.filterDateTo = endOfToday()
      this.first = 0
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
