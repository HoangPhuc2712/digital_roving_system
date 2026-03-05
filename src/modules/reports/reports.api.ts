import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'

import type { ReportImage, ReportRow } from './reports.types'

type ApiEnvelope<T> = {
  data: T
  success: boolean
  message: string
}

type ApiReportImage = {
  priId: number
  prId: number
  priImage: string
  priImageType?: string
}

type ApiPointReportView = {
  prId: number
  prStatus: number
  prHasProblem: boolean
  prNote?: string

  cpId: number
  cpCode: string
  cpName: string
  cpDescription?: string

  areaId: number
  areaCode?: string
  areaName?: string

  scanAt?: string
  createdAt?: string
  createdBy?: string
  createdName?: string

  prSecond?: number
  routeId?: number
  rdId?: number
  rdSecond?: number

  reportImages?: ApiReportImage[]
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

function normalizeImage(img: ApiReportImage): ReportImage {
  const raw = String(img?.priImage ?? '').trim()
  const ext =
    String(img?.priImageType ?? 'jpeg')
      .trim()
      .toLowerCase() || 'jpeg'

  const finalSrc = raw.startsWith('data:image/')
    ? raw
    : raw
      ? `data:image/${ext};base64,${raw}`
      : ''

  return {
    pri_id: Number(img?.priId ?? 0),
    pr_id: Number(img?.prId ?? 0),
    pri_image: finalSrc,
    pri_image_type: ext,
  }
}

export async function fetchReportRows(): Promise<ReportRow[]> {
  const res = await http.post(endpoints.pointReportView.getList, {})
  const views = ensureSuccess<ApiPointReportView[]>(res.data).data ?? []

  return views
    .map((v) => {
      const imgs = Array.isArray(v.reportImages) ? v.reportImages : []
      const normalizedImgs = imgs.map(normalizeImage).filter((x) => !!x.pri_image)

      const areaCode = String(v.areaCode ?? '')
      const areaName = String(v.areaName ?? '')
      const cpCode = String(v.cpCode ?? '')
      const cpName = String(v.cpName ?? '')
      const cpDesc = String(v.cpDescription ?? '')

      const guardName = String(v.createdName ?? '')
      const note = String(v.prNote ?? '')

      const q = [areaCode, areaName, cpCode, cpName, cpDesc, guardName, note]
        .join(' ')
        .toLowerCase()

      const scanAt = String(v.scanAt ?? v.createdAt ?? nowIso())
      const createdAt = String(v.createdAt ?? v.scanAt ?? nowIso())

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
        created_at: createdAt,
        created_by: String(v.createdBy ?? ''),
        created_name: guardName,

        pr_second: Number(v.prSecond ?? 0),
        route_id: Number(v.routeId ?? 0),
        rd_id: Number(v.rdId ?? 0),
        rd_second: Number(v.rdSecond ?? 0),

        report_images: normalizedImgs,
        image_count: normalizedImgs.length,

        _q: q,
      }
    })
    .sort((a, b) => (a.scan_at < b.scan_at ? 1 : -1))
}

export async function fetchReportRowById(pr_id: number): Promise<ReportRow | null> {
  try {
    const res = await http.get(endpoints.pointReportView.getOne(pr_id))
    const v = ensureSuccess<ApiPointReportView>(res.data).data
    if (!v) return null

    const imgs = Array.isArray(v.reportImages) ? v.reportImages : []
    const normalizedImgs = imgs.map(normalizeImage).filter((x) => !!x.pri_image)

    const areaCode = String(v.areaCode ?? '')
    const areaName = String(v.areaName ?? '')
    const cpCode = String(v.cpCode ?? '')
    const cpName = String(v.cpName ?? '')
    const cpDesc = String(v.cpDescription ?? '')

    const guardName = String(v.createdName ?? '')
    const note = String(v.prNote ?? '')

    const q = [areaCode, areaName, cpCode, cpName, cpDesc, guardName, note].join(' ').toLowerCase()

    const scanAt = String(v.scanAt ?? v.createdAt ?? nowIso())
    const createdAt = String(v.createdAt ?? v.scanAt ?? nowIso())

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
      created_at: createdAt,
      created_by: String(v.createdBy ?? ''),
      created_name: guardName,

      pr_second: Number(v.prSecond ?? 0),
      route_id: Number(v.routeId ?? 0),
      rd_id: Number(v.rdId ?? 0),
      rd_second: Number(v.rdSecond ?? 0),

      report_images: normalizedImgs,
      image_count: normalizedImgs.length,

      _q: q,
    }
  } catch {
    return null
  }
}

export async function fetchReportImagesByReportId(pr_id: number): Promise<ReportImage[]> {
  try {
    const res = await http.get(endpoints.pointReportImage.getListByReportId(pr_id))
    const imgs = ensureSuccess<ApiReportImage[]>(res.data).data ?? []
    return imgs.map(normalizeImage).filter((x) => !!x.pri_image)
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}
