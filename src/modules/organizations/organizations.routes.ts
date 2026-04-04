export const organizationsRoutes = [
  {
    path: '/organizations',
    name: 'organizations',
    component: () => import('./pages/OrganizationsPage.vue'),
    meta: { requiresAuth: true },
  },
]
