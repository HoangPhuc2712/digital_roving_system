export const usersRoutes = [
  {
    path: '/users',
    name: 'users',
    component: () => import('./pages/UserList.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/users/:id/patrol-path',
    name: 'user-patrol-path',
    component: () => import('@/modules/users/pages/UserPatrolPath.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
]
