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
  shift_text: string
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
  shift_problem: boolean

  report_images: ReportImage[]
  note_groups: ReportNoteGroup[]
  image_count: number

  _q: string
}

export type CtpatReportRow = {
  pr_id: number
  area_name: string
  check_point_name: string
  cp_priority: number
  start_at: string
  end_at: string
  scan_at: string
  report_name: string
  route_id: number
  route_name: string

  _q: string
}

export type PatrolDetailReportRow = {
  row_id: string
  ps_id: number
  area_id: number
  route_id: number
  route_code: string
  route_name: string
  check_point_name: string
  start_time: string
  finish_time: string
  patrol_time: string
  report_name: string
  pr_id: number
  pr_status: number
  pr_has_problem: boolean
  point_time_problem: boolean
  shift_key: string
  shift_color: string
  event_zh: string
  event_vi: string

  _q: string
}

export type PatrolSummaryMissedPatrolDetailRow = {
  row_id: string
  route_name: string
  patrol_time: string
}

export type PatrolSummaryTimeProblemDetailRow = {
  row_id: string
  patrol_time: string
  actual_patrol_time: string
  standard_patrol_time: string
}

export type PatrolSummaryInsufficientPatrolDetailRow = {
  row_id: string
  area_name: string
  cp_name: string
  patrol_time: string
  actual_time: string
  guard_name: string
  event_information: string
  shift_color: string
}

export type PatrolSummaryShiftProblemDetailRow = {
  row_id: string
  route_name: string
  cp_name: string
  patrol_time: string
  actual_time: string
  guard_name: string
  is_out_of_shift: boolean
  shift_color: string
}

export type PatrolSummaryReportRow = {
  date_key: string
  date_label: string
  area_id: number
  area_name: string
  required_count: number
  actual_count: number
  missed_count: number
  time_slow_problem_count: number
  time_fast_problem_count: number
  insufficient_count: number
  shift_problem_count: number
  abnormal_rate: number
  missed_patrol_details: PatrolSummaryMissedPatrolDetailRow[]
  time_slow_problem_details: PatrolSummaryTimeProblemDetailRow[]
  time_fast_problem_details: PatrolSummaryTimeProblemDetailRow[]
  insufficient_patrol_details: PatrolSummaryInsufficientPatrolDetailRow[]
  shift_problem_details: PatrolSummaryShiftProblemDetailRow[]
}

export type IncorrectScanLogRow = {
  scql_id: number
  ps_id: number
  route_id: number
  route_code: string
  route_name: string
  ps_start_at: string
  ps_end_at: string
  created_at: string
  wrong_cp_id: number
  wrong_cp_code: string
  wrong_cp_name: string
  correct_cp_id: number
  correct_cp_code: string
  correct_cp_name: string
  created_name: string

  _q: string
}

export type RoutesChartShiftNode = {
  ps_id: number
  route_id: number
  route_name: string
  patrol_at: string
  patrol_label: string
  reality_second: number
  reality_minute: number
  ps_hour_from: number | null
  ps_hour_to: number | null
}

export type RoutesChartRouteCard = {
  route_id: number
  route_code: string
  route_name: string
  route_min_minute: number
  route_max_minute: number
  labels: string[]
  values: number[]
  tooltip_titles: string[]
  average_minute: number | null
}
