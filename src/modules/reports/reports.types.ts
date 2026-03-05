export type ReportImage = {
  pri_id: number
  pr_id: number
  pri_image: string
  pri_image_type?: string
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
  created_at: string
  created_by: string
  created_name: string

  pr_second: number
  route_id: number
  rd_id: number
  rd_second: number

  report_images: ReportImage[]
  image_count: number

  _q: string
}
