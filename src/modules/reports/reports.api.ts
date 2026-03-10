import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'

import type { ReportImage, ReportNoteGroup, ReportRow } from './reports.types'

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
  routeId?: number
  routeName?: string
  rdId?: number
  planSecond?: number
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

  const q = [areaCode, areaName, cpCode, cpName, cpDesc, reportName, note, ...groupNotes]
    .join(' ')
    .toLowerCase()

  const scanAt = String(v.scanAt ?? v.reportAt ?? v.updatedAt ?? nowIso())
  const reportAt = String(v.reportAt ?? v.scanAt ?? v.updatedAt ?? nowIso())
  const createdAt = String(v.updatedAt ?? v.reportAt ?? v.scanAt ?? nowIso())

  const actualSecond = Number(v.realitySecond ?? 0)
  const planSecond = Number(v.planSecond ?? 0)

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

    pr_second: actualSecond,
    route_id: Number(v.routeId ?? 0),
    route_name: String(v.routeName ?? ''),
    rd_id: Number(v.rdId ?? 0),
    rd_second: planSecond,

    plan_second: planSecond,
    ps_id: Number(v.psId ?? 0),
    ps_day: Number(v.psDay ?? 0),
    ps_month: Number(v.psMonth ?? 0),
    ps_year: Number(v.psYear ?? 0),
    ps_hour_from: Number(v.psHourFrom ?? 0),
    ps_hour_to: Number(v.psHourTo ?? 0),

    report_images: flatImages,
    note_groups: noteGroups,
    image_count: flatImages.length,

    _q: q,
  }
}

export async function fetchReportRows(): Promise<ReportRow[]> {
  const res = await http.post(endpoints.pointReportView.getList, {})
  const payload = ensureSuccess<ApiPointReportView[] | ApiPointReportView>(res.data).data
  const views = asArray(payload)

  return views.map(normalizeView).sort((a, b) => (a.report_at < b.report_at ? 1 : -1))
}

export async function fetchReportRowById(pr_id: number): Promise<ReportRow | null> {
  try {
    const res = await http.get(endpoints.pointReportView.getOne(pr_id))
    const payload = ensureSuccess<ApiPointReportView>(res.data).data
    if (!payload) return null
    return normalizeView(payload)
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
