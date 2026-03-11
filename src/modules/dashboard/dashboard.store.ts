import { defineStore } from 'pinia'
import type {
  DashboardTotalAppItem,
  DashboardTotalCheckpointByAreaItem,
  DashboardTotalUserByAreaItem,
  DashboardTotalUserByRoleItem,
  DashboardTotalPointReportByStatusItem,
} from './dashboard.types'
import {
  fetchDashboardCards,
  fetchDashboardTotalCheckpointByArea,
  fetchDashboardTotalUserByArea,
  fetchDashboardTotalUserByRole,
  fetchDashboardTotalPointReportByStatus,
} from './dashboard.api'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    loading: false,
    error: '' as string,
    cards: [] as DashboardTotalAppItem[],
    totalUsersByRole: [] as DashboardTotalUserByRoleItem[],
    totalUsersByArea: [] as DashboardTotalUserByAreaItem[],
    totalCheckpointsByArea: [] as DashboardTotalCheckpointByAreaItem[],
    totalPointReportsByStatus: [] as DashboardTotalPointReportByStatusItem[],
  }),

  actions: {
    async load() {
      this.loading = true
      this.error = ''

      const results = await Promise.allSettled([
        fetchDashboardCards(),
        fetchDashboardTotalUserByRole(),
        fetchDashboardTotalUserByArea(),
        fetchDashboardTotalCheckpointByArea(),
        fetchDashboardTotalPointReportByStatus(),
      ])

      const [
        cardsRes,
        usersByRoleRes,
        usersByAreaRes,
        checkpointsByAreaRes,
        pointReportsByStatusRes,
      ] = results

      if (cardsRes.status === 'fulfilled') {
        this.cards = cardsRes.value
      } else {
        this.cards = []
      }

      if (usersByRoleRes.status === 'fulfilled') {
        this.totalUsersByRole = usersByRoleRes.value
      } else {
        this.totalUsersByRole = []
      }

      if (usersByAreaRes.status === 'fulfilled') {
        this.totalUsersByArea = usersByAreaRes.value
      } else {
        this.totalUsersByArea = []
      }

      if (checkpointsByAreaRes.status === 'fulfilled') {
        this.totalCheckpointsByArea = checkpointsByAreaRes.value
      } else {
        this.totalCheckpointsByArea = []
      }

      if (pointReportsByStatusRes.status === 'fulfilled') {
        this.totalPointReportsByStatus = pointReportsByStatusRes.value
      } else {
        this.totalPointReportsByStatus = []
      }

      const firstRejected = results.find((x) => x.status === 'rejected')
      this.error =
        firstRejected?.status === 'rejected'
          ? String(firstRejected.reason?.message ?? 'FAILED_TO_LOAD')
          : ''
      this.loading = false
    },
  },
})
