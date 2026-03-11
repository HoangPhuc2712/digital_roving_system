export type DashboardTotalAppItem = {
  stt: number
  name: string
  color: string
  totalItem: number
}

export type DashboardCardMeta = {
  mcCode?: string
  to?: string
}

export type DashboardTotalUserByRoleItem = {
  role_id: number
  role_code: string
  role_name: string
  total_user: number
}

export type DashboardTotalUserByAreaDetailItem = {
  role_id: number
  role_code: string
  role_name: string
  total_user: number
}

export type DashboardTotalUserByAreaItem = {
  area_id: number
  area_code: string
  area_name: string
  total_user: number
  details: DashboardTotalUserByAreaDetailItem[]
}

export type DashboardTotalCheckpointByAreaItem = {
  area_id: number
  area_code: string
  area_name: string
  total_check_point: number
}

export type DashboardTotalPointReportByStatusItem = {
  pr_status: number
  pr_status_name: string
  total_problem: number
}
