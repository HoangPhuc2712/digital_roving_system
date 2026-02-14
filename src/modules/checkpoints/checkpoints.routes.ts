export const checkpointsRoutes = [
  {
    path: '/checkpoints',
    name: 'checkpoints',
    component: () => import('./pages/CheckpointList.vue'),
    meta: { requiresAuth: true, permission: 'checkpoints.manage' },
  },
]
