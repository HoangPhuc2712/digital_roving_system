import { authRoutes } from '@/modules/auth/auth.routes'
import MainLayout from '@/layouts/MainLayout.vue'
import { usersRoutes } from '@/modules/users/users.routes'
import { areasRoutes } from '@/modules/areas/areas.routes'
import { checkpointsRoutes } from '@/modules/checkpoints/checkpoints.routes'
import { reportsRoutes } from '@/modules/reports/reports.routes'

export const routes = [
  ...authRoutes,
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/reports' },
      ...reportsRoutes,
      ...usersRoutes,
      ...areasRoutes,
      ...checkpointsRoutes,
      {
        path: '403',
        name: 'forbidden',
        component: () => import('@/components/common/BaseEmptyState.vue'),
      },
    ],
  },
]
