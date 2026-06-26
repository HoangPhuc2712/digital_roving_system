import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/auth.store'

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

async function clearPageFiltersByRouteName(routeName: string | symbol | null | undefined) {
  switch (routeName) {
    case 'areas': {
      const { useAreasStore } = await import('@/modules/areas/areas.store')
      useAreasStore().clearFilters()
      break
    }
    case 'checkpoints': {
      const { useCheckpointsStore } = await import('@/modules/checkpoints/checkpoints.store')
      useCheckpointsStore().clearFilters()
      break
    }
    case 'reports': {
      const { useReportsStore } = await import('@/modules/reports/reports.store')
      useReportsStore().clearFilters()
      break
    }
    case 'ctpat-reports': {
      const { useCtpatReportsStore } = await import('@/modules/reports/ctpatReports.store')
      useCtpatReportsStore().clearFilters()
      break
    }
    case 'incorrect-scan-reports': {
      const { useIncorrectScanLogStore } = await import('@/modules/reports/incorrectScanLog.store')
      useIncorrectScanLogStore().clearFilters()
      break
    }
    case 'gps-log-reports': {
      const { useGpsLogReportsStore } = await import('@/modules/reports/gpsLogReports.store')
      useGpsLogReportsStore().clearFilters()
      break
    }
    case 'patrol-detail-reports': {
      const { usePatrolDetailReportsStore } = await import('@/modules/reports/patrolDetailReports.store')
      usePatrolDetailReportsStore().clearFilters()
      break
    }
    case 'patrol-summary-reports': {
      const { usePatrolSummaryReportsStore } = await import('@/modules/reports/patrolSummaryReports.store')
      usePatrolSummaryReportsStore().clearFilters()
      break
    }
    case 'routes-chart-reports': {
      const { useRoutesChartReportsStore } = await import('@/modules/reports/routesChartReports.store')
      useRoutesChartReportsStore().clearFilters()
      break
    }
    case 'roles': {
      const { useRolesStore } = await import('@/modules/roles/roles.store')
      useRolesStore().clearFilters()
      break
    }
    case 'routes': {
      const { useRoutesStore } = await import('@/modules/routes/routes.store')
      useRoutesStore().clearFilters()
      break
    }
    case 'users': {
      const { useUsersStore } = await import('@/modules/users/users.store')
      useUsersStore().clearFilters()
      break
    }
    default:
      break
  }
}

router.beforeEach(async (to) => {
  await clearPageFiltersByRouteName(to.name)

  const auth = useAuthStore()
  if (!auth.token) auth.restoreSession()

  if (to.meta.requiresAuth) {
    if (!auth.isAuthenticated) {
      return { name: 'login' }
    }

    if (auth.isTokenExpired()) {
      await auth.expireSession()
      return { name: 'login' }
    }

    if (!auth.sessionSyncedOnce) {
      const ok = await auth.syncSessionWithServer()
      if (!ok || !auth.isAuthenticated) {
        return { name: 'login' }
      }
    }
  }

  const required = to.meta.permission as any
  if (required && !auth.canAccess(required)) {
    return { name: 'forbidden' }
  }

  if (to.meta.adminOnly && !auth.isAdminUser) {
    return { name: 'forbidden' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})
