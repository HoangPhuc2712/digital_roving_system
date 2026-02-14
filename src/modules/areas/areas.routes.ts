export const areasRoutes = [
  {
    path: '/areas',
    name: 'areas',
    component: () => import('./pages/AreaList.vue'),
    meta: { requiresAuth: true, permission: 'areas.manage' },
  },
]
