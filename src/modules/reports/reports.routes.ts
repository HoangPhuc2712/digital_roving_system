export const reportsRoutes = [
  {
    path: 'reports',
    name: 'reports',
    component: () => import('@/modules/reports/pages/ReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
  {
    path: 'gps-log-reports',
    name: 'gps-log-reports',
    component: () => import('@/modules/reports/pages/GpsLogReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'], adminOnly: true },
  },
  {
    path: 'incorrect-scan-reports',
    name: 'incorrect-scan-reports',
    component: () => import('@/modules/reports/pages/IncorrectScanReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
  {
    path: 'ctpat-reports',
    name: 'ctpat-reports',
    component: () => import('@/modules/reports/pages/CtpatReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
  {
    path: 'patrol-detail-reports',
    name: 'patrol-detail-reports',
    component: () => import('@/modules/reports/pages/PatrolDetailReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
  {
    path: 'patrol-summary-reports',
    name: 'patrol-summary-reports',
    component: () => import('@/modules/reports/pages/PatrolSummaryReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
  {
    path: 'routes-chart-reports',
    name: 'routes-chart-reports',
    component: () => import('@/modules/reports/pages/RoutesChartReportList.vue'),
    meta: { permission: ['reports.view_all', 'reports.view_mine'] },
  },
]
