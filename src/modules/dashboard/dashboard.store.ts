import { defineStore } from 'pinia'
import type { DashboardTotalAppItem } from './dashboard.types'
import { fetchDashboardCards } from './dashboard.api'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    loading: false,
    error: '' as string,
    cards: [] as DashboardTotalAppItem[],
  }),

  actions: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.cards = await fetchDashboardCards()
      } catch (e: any) {
        this.error = String(e?.message ?? 'FAILED_TO_LOAD')
        this.cards = []
      } finally {
        this.loading = false
      }
    },
  },
})
