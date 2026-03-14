export type MenuCategoryStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export type MenuCategoryRow = {
  mc_id: number
  mc_code: string
  mc_name: string
  mc_active: boolean
  mc_priority: number
  created_date: string
  updated_date: string
  _q: string
}
