import { defineStore } from 'pinia'
import { fetchAllPagedRows, toApiPage } from '@/utils/pagination'
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
    totalRecords: 0,
  }),

  getters: {
    filteredRows(): IncorrectScanLogRow[] {
      // API filtering/pagination is authoritative; avoid filtering the current page twice.
      return this.rows.slice()

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

        const result = await fetchIncorrectScanLogRows({
          createdAtFrom: from,
          createdAtTo: to,
          page: toApiPage(this.first, this.rowsPerPage),
          pageSize: this.rowsPerPage,
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

      const rows = await fetchAllPagedRows((pageParams) =>
        fetchIncorrectScanLogRows({
          ...pageParams,
          createdAtFrom: from,
          createdAtTo: to,
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
