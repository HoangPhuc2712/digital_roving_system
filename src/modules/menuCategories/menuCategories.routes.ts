export const menuCategoriesRoutes = [
  {
    path: '/menuCategories',
    name: 'menuCategories',
    component: () => import('./pages/MenuCategoryList.vue'),
    meta: { requiresAuth: true, permission: 'menuCategories.manage' },
  },
]
