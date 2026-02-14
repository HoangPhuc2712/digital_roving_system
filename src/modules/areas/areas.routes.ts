export const areasRoutes = [
  {
    path: '/areas',
    name: 'areas',
    component: () => import('./pages/AreaList.vue'),
    meta: { requiresAuth: true, permission: 'areas.manage' },
  },
  {
    path: '/areas/create',
    name: 'areas-create',
    component: () => import('./pages/AreaForm.vue'),
    meta: { requiresAuth: true, permission: 'areas.manage' },
  },
  {
    path: '/areas/:id/edit',
    name: 'areas-edit',
    component: () => import('./pages/AreaForm.vue'),
    meta: { requiresAuth: true, permission: 'areas.manage' },
  },
]
