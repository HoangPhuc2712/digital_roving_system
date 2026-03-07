export type DashboardStats = {
  totalReports: number
  issuedReports: number
  pendingReports: number
  roles: number
  users: number
  scanPoints: number
  routes: number
}

export type DashboardCard = {
  key: keyof DashboardStats
  title: string
  mcCode?: string
  to?: string
  className?: string
}
