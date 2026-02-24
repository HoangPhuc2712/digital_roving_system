export const reportsRoutes = [
  {
    path: 'reports',
    name: 'reports',
    component: () => import('@/modules/reports/pages/ReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
]
