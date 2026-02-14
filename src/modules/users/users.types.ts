export type UserStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export type RoleOption = {
  label: string
  value: number // role_id
}

export type UserRow = {
  user_id: string
  user_name: string
  user_code: string
  user_role_id: number
  role_name: string
  role_code: string
  user_status: number
  created_date: string
  updated_date: string

  _q: string
}
