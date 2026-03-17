import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'

import type {
  CtpatReportRow,
  PatrolDetailReportRow,
  PatrolSummaryReportRow,
  ReportImage,
  ReportNoteGroup,
  ReportRow,
} from './reports.types'

type ApiEnvelope<T> = {
  data: T
  success: boolean
  message: string
}

type ApiGroupedReportImage = {
  priId?: number
  prId?: number
  priImage?: string
  priImageType?: string
}

type ApiReportImage = {
  priId?: number
  prId?: number
  priGroup?: number
  priImageNote?: string
  priImage?: string
  priImageType?: string
}

type ApiNoteGroup = {
  prGroup?: number
  priImageNote?: string
  reportImages?: ApiGroupedReportImage[]
}

type ApiPointReportView = {
  prId?: number
  prStatus?: number
  prHasProblem?: boolean
  prNote?: string

  cpId?: number
  cpCode?: string
  cpName?: string
  cpDescription?: string

  areaId?: number
  areaCode?: string
  areaName?: string

  scanAt?: string
  realitySecond?: number
  realityHours?: number
  realityMinutes?: number
  realitySeconds?: number

  routeId?: number
  routeName?: string
  rdId?: number
  planSecond?: number
  planHours?: number
  planMinutes?: number
  planSeconds?: number

  timeProblem?: boolean
  shiftProblem?: boolean
  psId?: number
  psDay?: number
  psMonth?: number
  psYear?: number
  psHourFrom?: number
  psHourTo?: number
  reportAt?: string
  reportBy?: string
  reportName?: string
  updatedAt?: string
  updatedBy?: string
  updatedName?: string

  noteGroups?: ApiNoteGroup[]
}

type ApiCtpatReportView = {
  prId?: number
  areaName?: string
  checkPointName?: string
  cpPriority?: number
  startAt?: string
  endAt?: string
  scanAt?: string
  reportName?: string
  routeId?: number
  routeName?: string
}

type ApiPatrolShiftPointReport = {
  prId?: number
  prStatus?: number
  prHasProblem?: boolean
  cpName?: string
  psId?: number
  reportAt?: string
  reportName?: string
  timeProblem?: boolean
}

type ApiPatrolShiftReportView = {
  psId?: number
  routeId?: number
  routeCode?: string
  routeName?: string
  areaId?: number
  timeProblem?: boolean
  pointProblem?: boolean
  reportTimeFrom?: string
  reportTimeTo?: string
  reportName?: string
  pointReports?: ApiPatrolShiftPointReport[]
}

type ApiPlannedPatrolShiftRouteDetail = {
  rdId?: number
  routeId?: number
  cpId?: number
  cpCode?: string
  cpName?: string
  rdSecond?: number
  rdMinute?: number
  rdPriority?: number
}

type ApiPlannedPatrolShiftView = {
  psId?: number
  psDay?: number
  psMonth?: number
  psYear?: number
  psHourFrom?: number
  psHourTo?: number
  psFrom?: string | number
  psTo?: string | number
  psStartAt?: string | null
  psEndAt?: string | null
  routeId?: number
  routeCode?: string
  routeName?: string
  areaId?: number
  roleId?: number
  planSecond?: number
  planHours?: number
  planMinutes?: number
  planSeconds?: number
  realitySecond?: number
  realityHours?: number
  realityMinutes?: number
  realitySeconds?: number
  timeProblem?: boolean
  planPoint?: number
  realityPoint?: number
  pointProblem?: boolean
  isComplete?: boolean
  reportdBy?: string
  reportName?: string
  routeDetails?: ApiPlannedPatrolShiftRouteDetail[]
}

function ensureSuccess<T>(payload: any): ApiEnvelope<T> {
  const e = payload as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) throw new Error(String(e.message ?? 'API_ERROR') || 'API_ERROR')
  return e
}

function nowIso() {
  return new Date().toISOString()
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  if (value == null) return []
  return [value]
}

function normalizeImageSrc(rawValue: string, extValue?: string) {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return ''

  const ext =
    String(extValue ?? 'jpeg')
      .trim()
      .toLowerCase() || 'jpeg'

  if (raw.startsWith('data:image/')) return raw
  return `data:image/${ext};base64,${raw}`
}

function normalizeFlatImage(img: ApiReportImage, fallbackIndex = 0): ReportImage {
  const src = normalizeImageSrc(String(img?.priImage ?? ''), img?.priImageType)

  return {
    pri_id: Number(img?.priId ?? fallbackIndex + 1),
    pr_id: Number(img?.prId ?? 0),
    pri_group: Number(img?.priGroup ?? 0),
    pri_image_note: String(img?.priImageNote ?? ''),
    pri_image: src,
    pri_image_type:
      String(img?.priImageType ?? 'jpeg')
        .trim()
        .toLowerCase() || 'jpeg',
  }
}

function normalizeNoteGroups(view: ApiPointReportView): ReportNoteGroup[] {
  const rawGroups = Array.isArray(view.noteGroups) ? view.noteGroups : []
  const prId = Number(view.prId ?? 0)

  return rawGroups.map((group, groupIndex) => {
    const rawImages = Array.isArray(group.reportImages) ? group.reportImages : []
    const reportImages = rawImages
      .map((img, imageIndex) => ({
        pri_id: Number(img?.priId ?? groupIndex * 1000 + imageIndex + 1),
        pr_id: Number(img?.prId ?? prId),
        pri_group: Number(group?.prGroup ?? groupIndex + 1),
        pri_image_note: String(group?.priImageNote ?? ''),
        pri_image: normalizeImageSrc(String(img?.priImage ?? ''), img?.priImageType),
        pri_image_type:
          String(img?.priImageType ?? 'jpeg')
            .trim()
            .toLowerCase() || 'jpeg',
      }))
      .filter((x) => !!x.pri_image)

    return {
      pr_group: Number(group?.prGroup ?? groupIndex + 1),
      pri_image_note: String(group?.priImageNote ?? ''),
      report_images: reportImages,
    }
  })
}

function flattenNoteGroups(noteGroups: ReportNoteGroup[]): ReportImage[] {
  return noteGroups.flatMap((group) => group.report_images)
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatHms(hours: number, minutes: number, seconds: number) {
  const h = Number.isFinite(hours) ? Math.max(0, hours) : 0
  const m = Number.isFinite(minutes) ? Math.max(0, minutes) : 0
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  return `${h}:${pad2(m)}:${pad2(s)}`
}

function formatHourMinute24h(hour: number, minute = 0) {
  const normalizedHour = ((Math.trunc(hour) % 24) + 24) % 24
  const normalizedMinute = Math.max(0, Math.min(59, Math.trunc(minute)))
  return `${normalizedHour}:${String(normalizedMinute).padStart(2, '0')}`
}

function formatShiftDatePrefix(view: ApiPlannedPatrolShiftView) {
  const day = Number(view.psDay ?? 0)
  const month = Number(view.psMonth ?? 0)
  const year = Number(view.psYear ?? 0)

  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseShiftValueTo24h(value: unknown, fallbackMinute = 0): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatHourMinute24h(value, fallbackMinute)
  }

  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const isoTimeMatch = raw.match(/T(\d{1,2}):(\d{2})/)
  if (isoTimeMatch) {
    const hh = Number(isoTimeMatch[1] ?? 0)
    const mm = Number(isoTimeMatch[2] ?? 0)
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      return formatHourMinute24h(hh, mm)
    }
  }

  const timeMatch = raw.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?$/)
  if (timeMatch) {
    const hh = Number(timeMatch[1] ?? 0)
    const minuteRaw = timeMatch[2]
    const mm = minuteRaw == null || minuteRaw === '' ? fallbackMinute : Number(minuteRaw)
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      return formatHourMinute24h(hh, mm)
    }
  }

  const dateParsed = new Date(raw)
  if (Number.isFinite(dateParsed.getTime())) {
    return formatHourMinute24h(dateParsed.getHours(), dateParsed.getMinutes())
  }

  return raw
}

function extractShiftText(view: ApiPlannedPatrolShiftView): string {
  const datePrefix = formatShiftDatePrefix(view)

  const startTime =
    parseShiftValueTo24h(view.psFrom, 0) ||
    (Number.isFinite(Number(view.psHourFrom))
      ? formatHourMinute24h(Number(view.psHourFrom), 0)
      : '')

  const endTime =
    parseShiftValueTo24h(view.psTo, 59) ||
    (Number.isFinite(Number(view.psHourTo)) ? formatHourMinute24h(Number(view.psHourTo), 59) : '')

  const timeLabel = startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime

  if (datePrefix && timeLabel) return `${datePrefix} ${timeLabel}`
  if (datePrefix) return datePrefix
  return timeLabel
}

async function enrichReportRowShift(row: ReportRow): Promise<ReportRow> {
  if (!row.ps_id) return row

  const fallbackDateRaw = String(row.report_at || row.scan_at || row.created_at || '').trim()
  const fallbackDate = fallbackDateRaw ? new Date(fallbackDateRaw) : null

  const psDay =
    Number(row.ps_day ?? 0) ||
    (fallbackDate && Number.isFinite(fallbackDate.getTime()) ? fallbackDate.getDate() : 0)
  const psMonth =
    Number(row.ps_month ?? 0) ||
    (fallbackDate && Number.isFinite(fallbackDate.getTime()) ? fallbackDate.getMonth() + 1 : 0)
  const psYear =
    Number(row.ps_year ?? 0) ||
    (fallbackDate && Number.isFinite(fallbackDate.getTime()) ? fallbackDate.getFullYear() : 0)

  if (!psDay || !psMonth || !psYear) return row

  try {
    const res = await http.post(endpoints.patrolShiftView.getList, {
      psDay,
      psMonth,
      psYear,
    })

    const payload = ensureSuccess<ApiPlannedPatrolShiftView[] | ApiPlannedPatrolShiftView>(
      res.data,
    ).data
    const views = asArray(payload)

    const matchedById = views.find((x) => Number(x.psId ?? 0) === Number(row.ps_id))
    const matched =
      matchedById ??
      views.find(
        (x) =>
          Number(x.routeId ?? 0) === Number(row.route_id) &&
          String(x.routeName ?? '').trim() === String(row.route_name ?? '').trim(),
      )

    if (!matched) return row

    return {
      ...row,
      shift_text: extractShiftText(matched),
    }
  } catch {
    return row
  }
}

function normalizeView(v: ApiPointReportView): ReportRow {
  const noteGroups = normalizeNoteGroups(v).filter(
    (group) => group.report_images.length > 0 || !!group.pri_image_note.trim(),
  )
  const flatImages = flattenNoteGroups(noteGroups)

  const areaCode = String(v.areaCode ?? '')
  const areaName = String(v.areaName ?? '')
  const cpCode = String(v.cpCode ?? '')
  const cpName = String(v.cpName ?? '')
  const cpDesc = String(v.cpDescription ?? '')

  const reportName = String(v.reportName ?? '')
  const reportBy = String(v.reportBy ?? '')
  const note = String(v.prNote ?? '')
  const groupNotes = noteGroups.map((group) => group.pri_image_note).filter(Boolean)

  const q = [areaCode, areaName, cpCode, cpName, reportName].join(' ').toLowerCase()

  const scanAt = String(v.scanAt ?? v.reportAt ?? v.updatedAt ?? nowIso())
  const reportAt = String(v.reportAt ?? v.scanAt ?? v.updatedAt ?? nowIso())
  const createdAt = String(v.updatedAt ?? v.reportAt ?? v.scanAt ?? nowIso())

  const actualSecond = Number(v.realitySecond ?? 0)
  const planSecond = Number(v.planSecond ?? 0)

  const realityHours = Number(v.realityHours ?? 0)
  const realityMinutes = Number(v.realityMinutes ?? 0)
  const realitySeconds = Number(v.realitySeconds ?? 0)

  const planHours = Number(v.planHours ?? 0)
  const planMinutes = Number(v.planMinutes ?? 0)
  const planSeconds = Number(v.planSeconds ?? 0)

  const timeProblem = Boolean(v.timeProblem)
  const shiftProblem = Boolean(v.shiftProblem)

  const realityTimeStr = formatHms(realityHours, realityMinutes, realitySeconds)
  const planTimeStr = formatHms(planHours, planMinutes, planSeconds)
  return {
    pr_id: Number(v.prId ?? 0),
    pr_status: Number(v.prStatus ?? 0),
    pr_has_problem: Boolean(v.prHasProblem),
    pr_note: note,

    cp_id: Number(v.cpId ?? 0),
    cp_code: cpCode,
    cp_name: cpName,
    cp_description: cpDesc,

    area_id: Number(v.areaId ?? 0),
    area_code: areaCode,
    area_name: areaName,

    scan_at: scanAt,
    report_at: reportAt,
    created_at: createdAt,
    created_by: reportBy,
    created_name: reportName,
    report_name: reportName,
    updated_at: String(v.updatedAt ?? v.reportAt ?? v.scanAt ?? nowIso()),
    updated_by: String(v.updatedBy ?? reportBy),
    updated_name: String(v.updatedName ?? reportName),

    pr_second: actualSecond,
    route_id: Number(v.routeId ?? 0),
    route_name: String(v.routeName ?? ''),
    shift_text: '',
    rd_id: Number(v.rdId ?? 0),
    rd_second: planSecond,

    plan_second: planSecond,
    ps_id: Number(v.psId ?? 0),
    ps_day: Number(v.psDay ?? 0),
    ps_month: Number(v.psMonth ?? 0),
    ps_year: Number(v.psYear ?? 0),
    ps_hour_from: Number(v.psHourFrom ?? 0),
    ps_hour_to: Number(v.psHourTo ?? 0),

    reality_hours: realityHours,
    reality_minutes: realityMinutes,
    reality_seconds: realitySeconds,
    plan_hours: planHours,
    plan_minutes: planMinutes,
    plan_seconds: planSeconds,

    reality_time_str: realityTimeStr,
    plan_time_str: planTimeStr,
    time_problem: timeProblem,
    shift_problem: shiftProblem,

    report_images: flatImages,
    note_groups: noteGroups,
    image_count: flatImages.length,

    _q: q,
  }
}

function toApiDateTimeZ(value: Date) {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  const hh = String(value.getHours()).padStart(2, '0')
  const mm = String(value.getMinutes()).padStart(2, '0')
  const ss = String(value.getSeconds()).padStart(2, '0')
  const ms = String(value.getMilliseconds()).padStart(3, '0')

  return `${y}-${m}-${d}T${hh}:${mm}:${ss}.${ms}Z`
}

type FetchReportRowsParams = {
  reportAtFrom?: Date | null
  reportAtTo?: Date | null
}

export async function fetchReportRows(params: FetchReportRowsParams = {}): Promise<ReportRow[]> {
  const body: Record<string, any> = {}

  if (params.reportAtFrom instanceof Date && Number.isFinite(params.reportAtFrom.getTime())) {
    body.reportAtFrom = toApiDateTimeZ(params.reportAtFrom)
  }

  if (params.reportAtTo instanceof Date && Number.isFinite(params.reportAtTo.getTime())) {
    body.reportAtTo = toApiDateTimeZ(params.reportAtTo)
  }

  const res = await http.post(endpoints.pointReportView.getList, body)
  const payload = ensureSuccess<ApiPointReportView[] | ApiPointReportView>(res.data).data
  const views = asArray(payload)

  return views.map(normalizeView).sort((a, b) => (a.report_at < b.report_at ? 1 : -1))
}

export async function fetchReportRowById(pr_id: number): Promise<ReportRow | null> {
  try {
    const res = await http.get(endpoints.pointReportView.getOne(pr_id))
    const payload = ensureSuccess<ApiPointReportView>(res.data).data
    if (!payload) return null

    const normalized = normalizeView(payload)
    return await enrichReportRowShift(normalized)
  } catch {
    return null
  }
}

export async function fetchReportImagesByReportId(pr_id: number): Promise<ReportImage[]> {
  try {
    const res = await http.get(endpoints.pointReportImage.getListByReportId(pr_id))
    const imgs = ensureSuccess<ApiReportImage[]>(res.data).data ?? []
    return imgs.map((img, idx) => normalizeFlatImage(img, idx)).filter((x) => !!x.pri_image)
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

type ChangeReportStatusPayload = {
  pr_id: number
  pr_status: number
  updated_by: string
}

export async function changeReportStatus(payload: ChangeReportStatusPayload): Promise<void> {
  const actor = String(payload.updated_by ?? '').trim()

  const body = {
    prStatus: Number(payload.pr_status ?? 0),
    updateBy: actor,
  }

  try {
    const res = await http.patch(endpoints.pointReport.changeStatus(payload.pr_id), body)
    ensureSuccess<unknown>(res.data)
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

function normalizeCtpatView(v: ApiCtpatReportView): CtpatReportRow {
  const areaName = String(v.areaName ?? '')
  const checkPointName = String(v.checkPointName ?? '')
  const routeName = String(v.routeName ?? '')
  const reportName = String(v.reportName ?? '')
  const startAt = String(v.startAt ?? '')
  const endAt = String(v.endAt ?? '')
  const scanAt = String(v.scanAt ?? '')
  const cpPriority = Number(v.cpPriority ?? 0)

  const q = [
    areaName,
    checkPointName,
    routeName,
    reportName,
    startAt,
    endAt,
    scanAt,
    String(cpPriority),
  ]
    .join(' ')
    .toLowerCase()

  return {
    pr_id: Number(v.prId ?? 0),
    area_name: areaName,
    check_point_name: checkPointName,
    cp_priority: cpPriority,
    start_at: startAt,
    end_at: endAt,
    scan_at: scanAt,
    report_name: reportName,
    route_id: Number(v.routeId ?? 0),
    route_name: routeName,
    _q: q,
  }
}

export async function fetchCtpatReportRows(): Promise<CtpatReportRow[]> {
  const res = await http.post(endpoints.report.ctpatReport, {})
  const payload = ensureSuccess<ApiCtpatReportView[] | ApiCtpatReportView>(res.data).data
  const views = asArray(payload)

  return views.map(normalizeCtpatView).sort((a, b) => (a.scan_at < b.scan_at ? 1 : -1))
}

function normalizePatrolDetailRows(views: ApiPatrolShiftReportView[]): PatrolDetailReportRow[] {
  const shiftColors = ['#ffeeba', '#bee5eb']

  const sortedViews = [...views].sort((a, b) => {
    const aStart = String(a.reportTimeFrom ?? '')
    const bStart = String(b.reportTimeFrom ?? '')
    if (aStart === bStart) return Number(a.psId ?? 0) - Number(b.psId ?? 0)
    return aStart.localeCompare(bStart)
  })

  const shiftColorMap = new Map<string, string>()
  let nextColorIndex = 0

  const rows = sortedViews.flatMap((view) => {
    const psId = Number(view.psId ?? 0)
    const routeId = Number(view.routeId ?? 0)
    const routeCode = String(view.routeCode ?? '')
    const routeName = String(view.routeName ?? '')
    const areaId = Number(view.areaId ?? 0)
    const startTime = String(view.reportTimeFrom ?? '')
    const finishTime = String(view.reportTimeTo ?? '')
    const shiftGuardName = String(view.reportName ?? '')
    const shiftKey = `${psId}|${routeId}|${startTime}|${finishTime}|${shiftGuardName}`

    const timeSlotKey = `${startTime}|${finishTime}`

    if (!shiftColorMap.has(timeSlotKey)) {
      shiftColorMap.set(timeSlotKey, shiftColors[nextColorIndex % shiftColors.length] ?? '#ffeeba')
      nextColorIndex += 1
    }

    const shiftColor = shiftColorMap.get(timeSlotKey) ?? '#ffeeba'
    const points = Array.isArray(view.pointReports) ? view.pointReports : []

    const sortedPoints = [...points].sort((a, b) => {
      const aTime = String(a.reportAt ?? '')
      const bTime = String(b.reportAt ?? '')
      if (aTime === bTime) return Number(a.prId ?? 0) - Number(b.prId ?? 0)
      return aTime.localeCompare(bTime)
    })

    return sortedPoints.map((point, pointIndex) => {
      const checkPointName = String(point.cpName ?? '')
      const reportName = String(point.reportName ?? shiftGuardName)
      const patrolTime = String(point.reportAt ?? '')
      const prStatus = Number(point.prStatus ?? 0)
      const prHasProblem = Boolean(point.prHasProblem)
      const pointTimeProblem = Boolean(point.timeProblem)

      const q = [
        routeCode,
        routeName,
        checkPointName,
        reportName,
        startTime,
        finishTime,
        patrolTime,
        String(areaId),
      ]
        .join(' ')
        .toLowerCase()

      return {
        row_id: `${psId}-${Number(point.prId ?? pointIndex + 1)}-${pointIndex}`,
        ps_id: psId,
        area_id: areaId,
        route_id: routeId,
        route_code: routeCode,
        route_name: routeName,
        check_point_name: checkPointName,
        start_time: startTime,
        finish_time: finishTime,
        patrol_time: patrolTime,
        report_name: reportName,
        pr_id: Number(point.prId ?? 0),
        pr_status: prStatus,
        pr_has_problem: prHasProblem,
        point_time_problem: pointTimeProblem,
        shift_key: shiftKey,
        shift_color: shiftColor,
        event_zh: '',
        event_vi: '',
        _q: q,
      }
    })
  })

  return rows.sort((a, b) => {
    const aTime = String(a.patrol_time ?? '')
    const bTime = String(b.patrol_time ?? '')

    if (aTime !== bTime) return aTime.localeCompare(bTime)
    if (a.ps_id !== b.ps_id) return Number(a.ps_id ?? 0) - Number(b.ps_id ?? 0)
    if (a.pr_id !== b.pr_id) return Number(a.pr_id ?? 0) - Number(b.pr_id ?? 0)
    return String(a.row_id ?? '').localeCompare(String(b.row_id ?? ''))
  })
}

export async function fetchPatrolDetailReportRows(): Promise<PatrolDetailReportRow[]> {
  const res = await http.post(endpoints.report.patrolDetailReport, {})
  const payload = ensureSuccess<ApiPatrolShiftReportView[] | ApiPatrolShiftReportView>(
    res.data,
  ).data
  const views = asArray(payload)
  return normalizePatrolDetailRows(views)
}

const SECURITY_ROLE_ID = 4

function normalizeDateOnly(value: Date) {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfLocalDay(value: Date) {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfLocalDay(value: Date) {
  const d = new Date(value)
  d.setHours(23, 59, 59, 999)
  return d
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b
}

function maxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b
}

function isSameLocalDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function eachDateInclusive(dateFrom: Date, dateTo: Date) {
  const start = startOfLocalDay(dateFrom)
  const end = startOfLocalDay(dateTo)

  const dates: Date[] = []
  const cursor = new Date(start)

  while (cursor.getTime() <= end.getTime()) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

function buildPlannedShiftStart(view: ApiPlannedPatrolShiftView) {
  const year = Number(view.psYear ?? 0)
  const month = Number(view.psMonth ?? 0)
  const day = Number(view.psDay ?? 0)
  const hourFrom = Number(view.psHourFrom ?? 0)

  if (!year || !month || !day) return null

  const d = new Date(year, month - 1, day, hourFrom, 0, 0, 0)
  return Number.isFinite(d.getTime()) ? d : null
}

// function buildActualShiftStart(view: ApiPatrolShiftReportView): Date | null {
//   const points = Array.isArray(view.pointReports) ? view.pointReports : []

//   const pointTimes = points
//     .map((point) => {
//       const raw = String(point?.reportAt ?? '').trim()
//       if (!raw) return null

//       const d = new Date(raw)
//       return Number.isFinite(d.getTime()) ? d : null
//     })
//     .filter((d): d is Date => d != null)
//     .sort((a, b) => a.getTime() - b.getTime())

//   const firstPointTime = pointTimes[0] ?? null
//   if (firstPointTime) {
//     return firstPointTime
//   }

//   const reportTimeFrom = String(view.reportTimeFrom ?? '').trim()
//   if (reportTimeFrom) {
//     const d = new Date(reportTimeFrom)
//     if (Number.isFinite(d.getTime())) return d
//   }

//   return null
// }

function isWithinWindow(value: Date | null, windowStart: Date, windowEnd: Date) {
  if (!value || !Number.isFinite(value.getTime())) return false
  const t = value.getTime()
  return t >= windowStart.getTime() && t <= windowEnd.getTime()
}

// async function fetchTotalPatrolShiftByDate(date: Date) {
//   const body = {
//     psDay: date.getDate(),
//     psMonth: date.getMonth() + 1,
//     psYear: date.getFullYear(),
//     roleId: SECURITY_ROLE_ID,
//   }

//   const res = await http.post(endpoints.report.totalPatrolShift, body)
//   const payload = ensureSuccess<ApiPatrolShiftReportView[] | ApiPatrolShiftReportView>(
//     res.data,
//   ).data
//   return asArray(payload)
// }

async function fetchPlannedPatrolShiftByDate(date: Date) {
  const body = {
    psDay: date.getDate(),
    psMonth: date.getMonth() + 1,
    psYear: date.getFullYear(),
    roleId: SECURITY_ROLE_ID,
  }

  const res = await http.post(endpoints.patrolShiftView.getList, body)
  const payload = ensureSuccess<ApiPlannedPatrolShiftView[] | ApiPlannedPatrolShiftView>(
    res.data,
  ).data
  return asArray(payload)
}

export async function fetchPatrolSummaryRows(
  dateFrom: Date,
  dateTo: Date,
): Promise<PatrolSummaryReportRow[]> {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)

  if (from.getTime() > to.getTime()) {
    const tmp = new Date(from)
    from.setTime(to.getTime())
    to.setTime(tmp.getTime())
  }

  const days = eachDateInclusive(from, to)
  const now = new Date()
  const rows: PatrolSummaryReportRow[] = []

  for (const day of days) {
    let windowStart = maxDate(startOfLocalDay(day), from)
    let windowEnd = minDate(endOfLocalDay(day), to)

    if (isSameLocalDate(day, now)) {
      windowEnd = minDate(windowEnd, now)
    }

    if (windowStart.getTime() > windowEnd.getTime()) {
      continue
    }

    const plannedViews = await fetchPlannedPatrolShiftByDate(day)

    const filteredPlannedViews = plannedViews.filter((item) =>
      isWithinWindow(buildPlannedShiftStart(item), windowStart, windowEnd),
    )

    const areaIds = new Set<number>()
    for (const item of filteredPlannedViews) {
      const areaId = Number(item.areaId ?? 0)
      if (areaId > 0) areaIds.add(areaId)
    }

    const dateLabel = normalizeDateOnly(day)

    for (const areaId of [...areaIds].sort((a, b) => a - b)) {
      const plannedRows = filteredPlannedViews.filter((item) => Number(item.areaId ?? 0) === areaId)

      const requiredCount = plannedRows.length

      const actualRows = plannedRows.filter((item) => {
        const startAt = String(item.psStartAt ?? '').trim()
        const endAt = String(item.psEndAt ?? '').trim()
        const realityPoint = Number(item.realityPoint ?? 0)
        const realitySecond = Number(item.realitySecond ?? 0)

        return !!startAt || !!endAt || realityPoint > 0 || realitySecond > 0
      })

      const actualCount = actualRows.length
      const missedCount = Math.max(requiredCount - actualCount, 0)
      const timeProblemCount = actualRows.filter((item) => Boolean(item.timeProblem)).length
      const insufficientCount = actualRows.filter((item) => Boolean(item.pointProblem)).length
      const abnormalTotal = missedCount + timeProblemCount + insufficientCount
      const abnormalRate = requiredCount > 0 ? (abnormalTotal / requiredCount) * 100 : 0

      rows.push({
        date_key: dateLabel,
        date_label: dateLabel,
        area_id: areaId,
        area_name: `Area ${areaId}`,
        required_count: requiredCount,
        actual_count: actualCount,
        missed_count: missedCount,
        time_problem_count: timeProblemCount,
        insufficient_count: insufficientCount,
        abnormal_rate: Number(abnormalRate.toFixed(2)),
      })
    }
  }

  return rows.sort((a, b) => {
    if (a.date_key === b.date_key) return a.area_name.localeCompare(b.area_name)
    return a.date_key.localeCompare(b.date_key)
  })
}
