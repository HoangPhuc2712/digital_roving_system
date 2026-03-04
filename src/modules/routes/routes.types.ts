export type RouteStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'
export type AreaOption = { label: string; value: number }

export type ScanPointOption = {
  label: string
  value: number // cpId
  cpCode: string
  cpName: string
}

export type RouteDetailModel = {
  cp_id: number
  cp_code: string
  cp_name: string
  rd_second: number
  rd_priority: number
}

export type RouteRow = {
  route_id: number
  route_code: string
  route_name: string
  route_status: number // UI: 1 active, 0 inactive
  route_priority: number
  route_total_second: number

  area_id: number
  area_code: string
  area_name: string

  details: RouteDetailModel[]
  details_count: number

  created_at: string
  updated_at: string

  _q: string
}
