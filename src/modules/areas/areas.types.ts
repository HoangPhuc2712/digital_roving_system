export type AreaStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export type AreaRow = {
  area_id: number
  area_code: string
  area_name: string
  area_status: number // 1 active, 0 inactive
  created_date: string
  updated_date: string

  _q: string // search index
}
