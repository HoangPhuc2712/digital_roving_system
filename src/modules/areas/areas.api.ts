import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import {
  appendPageParams,
  normalizePagedData,
  type ApiPageParams,
  type ApiPagedResult,
} from '@/utils/pagination'
import type { AreaRow } from './areas.types'

type ApiEnvelope<T> = {
  data: T
  success: boolean
  message: string
}

type ApiCheckPointLite = {
  cpId: number
  cpCode: string
  cpName: string
  areaId: number
}

type ApiAreaView = {
  areaId: number
  areaStatus: number
  areaKeyword?: string
  areaCode: string
  areaName: string
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  createdName?: string
  updatedName?: string
  totalCheckPoint: number
}

function nowIso() {
  return new Date().toISOString()
}

function ensureSuccess<T>(payload: any): ApiEnvelope<T> {
  const e = payload as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) throw new Error(String((e as any).message ?? 'API_ERROR') || 'API_ERROR')
  return e
}

// Backend: 0 = Active. UI: 1 = Active.
function apiStatusToUi(status?: number) {
  if (status == null) return 1
  return status === 0 ? 1 : 0
}

function mapAreaView(v: ApiAreaView): AreaRow {
  const q = String(v.areaKeyword ?? `${v.areaCode} ${v.areaName}`).toLowerCase()

  return {
    area_id: v.areaId,
    area_code: v.areaCode,
    area_name: v.areaName,
    area_status: apiStatusToUi(v.areaStatus),
    total_checkpoints: v.totalCheckPoint,
    created_date: v.createdAt ?? nowIso(),
    updated_date: v.updatedAt ?? nowIso(),
    _q: q,
  }
}

export async function fetchAreaRowsPaged(
  params: ApiPageParams = {},
): Promise<ApiPagedResult<AreaRow>> {
  const body: Record<string, any> = {}
  appendPageParams(body, params)

  const res = await http.post(endpoints.areaView.getList, body)
  const payload = ensureSuccess<any>(res.data).data
  const paged = normalizePagedData<ApiAreaView>(payload)

  return {
    ...paged,
    items: paged.items
      .map(mapAreaView)
      .sort((a, b) => Number(a.area_id ?? 0) - Number(b.area_id ?? 0)),
  }
}

export async function fetchAreaRows(): Promise<AreaRow[]> {
  const result = await fetchAreaRowsPaged()
  return result.items
}

export async function fetchAreaById(area_id: number) {
  const res = await http.get(endpoints.areaView.getOne(area_id))
  const view = ensureSuccess<ApiAreaView>(res.data).data

  return {
    area_id: view.areaId,
    area_code: view.areaCode,
    area_name: view.areaName,
    area_status: apiStatusToUi(view.areaStatus),
    total_checkpoints: view.totalCheckPoint,
    created_date: view.createdAt ?? nowIso(),
    updated_date: view.updatedAt ?? nowIso(),
    _q: String(view.areaKeyword ?? `${view.areaCode} ${view.areaName}`).toLowerCase(),
  }
}

export async function createAreaMock(payload: {
  area_code: string
  area_name: string
  actor_id: string
}) {
  const body = {
    areaCode: payload.area_code.trim(),
    areaName: payload.area_name.trim(),
    createdBy: payload.actor_id,
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.post(endpoints.area.create, body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function updateAreaMock(payload: {
  area_id: number
  area_code: string
  area_name: string
  actor_id: string
}) {
  const body = {
    areaCode: payload.area_code.trim(),
    areaName: payload.area_name.trim(),
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.patch(endpoints.area.update(payload.area_id), body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function deleteAreaMock(payload: { area_id: number; actor_id: string }) {
  const body = { updatedBy: payload.actor_id }

  try {
    const res = await http.delete(endpoints.area.delete(payload.area_id), { data: body })
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function fetchAreaOptions() {
  // dùng GET /Area/getbaselist nếu bạn muốn dropdown area đầy đủ
  const res = await http.get(endpoints.area.getBaseList)
  const env = ensureSuccess<any[]>(res.data)
  const list = env.data ?? []

  return list
    .map((a: any) => ({
      label: a.areaName ?? a.areaCode ?? String(a.areaId),
      value: a.areaId,
    }))
    .sort((x: any, y: any) => Number(x.value ?? 0) - Number(y.value ?? 0))
}
