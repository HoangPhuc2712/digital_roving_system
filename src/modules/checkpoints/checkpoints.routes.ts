export const checkpointsRoutes = [
  {
    path: '/checkpoints',
    name: 'checkpoints',
    component: () => import('./pages/CheckpointList.vue'),
    meta: { requiresAuth: true, permission: 'checkpoints.manage' },
  },
  {
    path: '/checkpoints/create',
    name: 'checkpoints-create',
    component: () => import('./pages/CheckpointForm.vue'),
    meta: { requiresAuth: true, permission: 'checkpoints.manage' },
  },
  {
    path: '/checkpoints/:id/edit',
    name: 'checkpoints-edit',
    component: () => import('./pages/CheckpointForm.vue'),
    meta: { requiresAuth: true, permission: 'checkpoints.manage' },
  },
]
