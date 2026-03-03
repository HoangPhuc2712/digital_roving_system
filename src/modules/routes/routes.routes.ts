export const routesRoutes = [
  {
    path: '/routes',
    name: 'routes',
    component: () => import('./pages/RouteList.vue'),
    meta: { requiresAuth: true, permission: 'routes.manage' },
  },
]
