import { authRoutes } from '@/modules/auth/auth.routes'
import MainLayout from '@/layouts/MainLayout.vue'
import { dashboardRoutes } from '@/modules/dashboard/dashboard.routes'
import { usersRoutes } from '@/modules/users/users.routes'
import { areasRoutes } from '@/modules/areas/areas.routes'
import { checkpointsRoutes } from '@/modules/checkpoints/checkpoints.routes'
import { reportsRoutes } from '@/modules/reports/reports.routes'
import { rolesRoutes } from '@/modules/roles/roles.routes'
import { routesRoutes } from '@/modules/routes/routes.routes'

export const routes = [
  ...authRoutes,
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      ...dashboardRoutes,
      ...reportsRoutes,
      ...usersRoutes,
      ...rolesRoutes,
      ...areasRoutes,
      ...checkpointsRoutes,
      ...routesRoutes,
      {
        path: '403',
        name: 'forbidden',
        component: () => import('@/components/common/BaseEmptyState.vue'),
      },
    ],
  },
]
