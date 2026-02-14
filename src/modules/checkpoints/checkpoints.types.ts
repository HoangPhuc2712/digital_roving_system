export type CheckpointStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export type AreaOption = { label: string; value: number }

export type CheckpointRow = {
  cp_id: number
  cp_code: string
  cp_name: string
  cp_qr: string
  cp_description: string
  cp_priority: number
  cp_status: number // 1 active, 0 inactive
  area_id: number
  area_code: string
  area_name: string

  created_at: string
  updated_at: string

  _q: string
}
