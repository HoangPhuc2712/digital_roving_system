import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/auth.store'
import { useAreasStore } from '@/modules/areas/areas.store'
import { useCheckpointsStore } from '@/modules/checkpoints/checkpoints.store'
import { useCtpatReportsStore } from '@/modules/reports/ctpatReports.store'
import { useIncorrectScanReportsStore } from '@/modules/reports/incorrectScanReports.store'
import { usePatrolDetailReportsStore } from '@/modules/reports/patrolDetailReports.store'
import { usePatrolSummaryReportsStore } from '@/modules/reports/patrolSummaryReports.store'
import { useReportsStore } from '@/modules/reports/reports.store'
import { useRolesStore } from '@/modules/roles/roles.store'
import { useRoutesStore } from '@/modules/routes/routes.store'
import { useUsersStore } from '@/modules/users/users.store'

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

function clearPageFiltersByRouteName(routeName: string | symbol | null | undefined) {
  switch (routeName) {
    case 'areas':
      useAreasStore().clearFilters()
      break
    case 'checkpoints':
      useCheckpointsStore().clearFilters()
      break
    case 'reports':
      useReportsStore().clearFilters()
      break
    case 'ctpat-reports':
      useCtpatReportsStore().clearFilters()
      break
    case 'incorrect-scan-reports':
      useIncorrectScanReportsStore().clearFilters()
      break
    case 'patrol-detail-reports':
      usePatrolDetailReportsStore().clearFilters()
      break
    case 'patrol-summary-reports':
      usePatrolSummaryReportsStore().clearFilters()
      break
    case 'roles':
      useRolesStore().clearFilters()
      break
    case 'routes':
      useRoutesStore().clearFilters()
      break
    case 'users':
      useUsersStore().clearFilters()
      break
    default:
      break
  }
}

router.beforeEach((to) => {
  clearPageFiltersByRouteName(to.name)

  const auth = useAuthStore()
  if (!auth.token) auth.restoreSession()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  const required = to.meta.permission as any
  if (required && !auth.canAccess(required)) {
    return { name: 'forbidden' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})
