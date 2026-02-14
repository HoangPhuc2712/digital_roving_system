export const usersRoutes = [
  {
    path: '/users',
    name: 'users',
    component: () => import('./pages/UserList.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/users/create',
    name: 'users-create',
    component: () => import('./pages/UserForm.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/users/:id/edit',
    name: 'users-edit',
    component: () => import('./pages/UserForm.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
]
