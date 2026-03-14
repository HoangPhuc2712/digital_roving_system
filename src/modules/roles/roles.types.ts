export type RoleStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export type MenuCategoryOption = {
  label: string
  value: number
  code: string
  priority: number
}

export type RoleRow = {
  role_id: number
  role_code: string
  role_name: string
  role_hour_report: boolean
  role_is_admin: boolean
  role_status: number // UI: 1 active, 0 inactive (map từ API)
  created_date: string
  updated_date: string

  menu_ids: number[]
  menu_names: string[]
  menu_count: number

  _q: string
}
