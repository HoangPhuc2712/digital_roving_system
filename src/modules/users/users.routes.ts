export const usersRoutes = [
  {
    path: '/users',
    name: 'users',
    component: () => import('./pages/UserList.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/user-info',
    name: 'user-info',
    component: () => import('./pages/UserInfo.vue'),
    meta: { requiresAuth: true },
  },
]
