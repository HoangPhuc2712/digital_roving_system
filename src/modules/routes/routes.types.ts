export type RouteStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'
export type AreaOption = { label: string; value: number }
export type RoleOption = { label: string; value: number }

export type ScanPointOption = {
  label: string
  value: number // cpId
  cpCode: string
  cpName: string
  cpPriority?: number
  cpQr?: string
  areaId: number
}

export type RouteDetailModel = {
  cp_id: number
  cp_code: string
  cp_name: string
  cp_qr: string
  cp_priority?: number
  rd_minute: number
  rd_priority: number
}

export type RouteRow = {
  route_id: number
  route_code: string
  route_name: string
  route_status: number // UI: 1 active, 0 inactive
  route_priority: number
  route_max_minute: number
  route_min_minute: number

  area_id: number
  area_code: string
  area_name: string

  role_id: number
  role_code: string
  role_name: string

  details: RouteDetailModel[]
  details_count: number

  created_at: string
  updated_at: string

  _q: string
}
