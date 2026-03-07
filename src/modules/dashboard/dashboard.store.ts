import { defineStore } from 'pinia'
import type { DashboardStats } from './dashboard.types'
import { fetchDashboardStats } from './dashboard.api'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    loading: false,
    error: '' as string,
    stats: null as DashboardStats | null,
  }),

  actions: {
    async load(payload: {
      includeReports: boolean
      includeRoles: boolean
      includeUsers: boolean
      includeScanPoints: boolean
      includeRoutes: boolean
    }) {
      this.loading = true
      this.error = ''
      try {
        this.stats = await fetchDashboardStats(payload)
      } catch (e: any) {
        this.error = String(e?.message ?? 'FAILED_TO_LOAD')
        this.stats = null
      } finally {
        this.loading = false
      }
    },
  },
})
