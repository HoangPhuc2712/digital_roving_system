export const reportsRoutes = [
  {
    path: 'reports',
    name: 'reports',
    component: () => import('@/modules/reports/pages/ReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
  {
    path: 'ctpat-reports',
    name: 'ctpat-reports',
    component: () => import('@/modules/reports/pages/CtpatReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
]
