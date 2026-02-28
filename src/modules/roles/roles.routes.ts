export const rolesRoutes = [
  {
    path: '/roles',
    name: 'roles',
    component: () => import('./pages/RoleList.vue'),
    meta: { requiresAuth: true, permission: 'roles.manage' },
  },
]
