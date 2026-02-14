export type ReportRow = {
  pr_id: number
  pr_check: boolean
  pr_note: string
  cp_id: number
  created_at: string
  created_by: string

  area_id: number
  area_code: string
  area_name: string

  cp_code: string
  cp_name: string
  cp_description: string

  user_id: string
  user_code: string
  user_name: string

  role_id: number
  role_code: string
  role_name: string

  image_count: number

  _q: string
}
