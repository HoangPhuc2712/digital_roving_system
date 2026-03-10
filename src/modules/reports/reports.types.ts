export type ResultFilter = 'ALL' | 'OK' | 'NOT_OK'

export type ReportImage = {
  pri_id: number
  pr_id: number
  pri_group: number
  pri_image_note: string
  pri_image: string
  pri_image_type?: string
}

export type ReportNoteGroup = {
  pr_group: number
  pri_image_note: string
  report_images: ReportImage[]
}

export type ReportRow = {
  pr_id: number
  pr_status: number
  pr_has_problem: boolean
  pr_note: string

  cp_id: number
  cp_code: string
  cp_name: string
  cp_description: string

  area_id: number
  area_code: string
  area_name: string

  scan_at: string
  report_at: string
  created_at: string
  created_by: string
  created_name: string
  report_name: string
  updated_at: string
  updated_by: string
  updated_name: string

  pr_second: number
  route_id: number
  route_name: string
  rd_id: number
  rd_second: number

  plan_second: number
  ps_id: number
  ps_day: number
  ps_month: number
  ps_year: number
  ps_hour_from: number
  ps_hour_to: number

  reality_hours: number
  reality_minutes: number
  reality_seconds: number
  plan_hours: number
  plan_minutes: number
  plan_seconds: number

  reality_time_str: string
  plan_time_str: string
  time_problem: boolean

  report_images: ReportImage[]
  note_groups: ReportNoteGroup[]
  image_count: number

  _q: string
}
