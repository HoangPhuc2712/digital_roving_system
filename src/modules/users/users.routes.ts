export const usersRoutes = [
  {
    path: '/users',
    name: 'users',
    component: () => import('./pages/UserList.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
]
