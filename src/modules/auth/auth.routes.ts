export const authRoutes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./pages/Login.vue'),
    meta: { requiresAuth: false },
  },
];