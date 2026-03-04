import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { CheckpointRow, AreaOption } from './checkpoints.types'

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

type ApiCheckPointView = {
  cpId: number
  cpKeyword?: string
  cpCode: string
  cpName: string
  cpQr?: string
  cpDescription?: string
  cpPriority: number
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  areaId: number
  areaCode?: string
  areaName?: string
}

type ApiCheckPointEntity = {
  cpId: number
  cpStatus?: number
  cpKeyword?: string
  cpCode: string
  cpName: string
  cpQr?: string
  cpDescription?: string
  cpPriority: number
  areaId: number
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

function nowIso() {
  return new Date().toISOString()
}

function ensureSuccess<T>(payload: any): ApiEnvelope<T> {
  const e = payload as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) throw new Error(String(e.message ?? 'API_ERROR') || 'API_ERROR')
  return e
}

// Backend: 0 = Active. UI: 1 = Active.
function apiStatusToUi(status?: number) {
  if (status == null) return 1
  return status === 0 ? 1 : 0
}

function normalizeSearch(x: {
  cp_keyword: string
  cp_code: string
  cp_name: string
  cp_description: string
  area_code: string
  area_name: string
}) {
  return `${x.cp_keyword} ${x.cp_code} ${x.cp_name} ${x.cp_description} ${x.area_code} ${x.area_name}`
    .toLowerCase()
    .trim()
}

export async function fetchAreaOptions(): Promise<AreaOption[]> {
  // tận dụng Area base list (đã có trong backend)
  const res = await http.get(endpoints.area.getBaseList)
  const env = ensureSuccess<any[]>(res.data)
  const list = env.data ?? []

  return list
    .map((a: any) => ({
      label: a.areaName ?? a.areaCode ?? String(a.areaId),
      value: Number(a.areaId ?? 0),
    }))
    .filter((x: AreaOption) => !!x.value)
    .sort((a: AreaOption, b: AreaOption) => String(a.label).localeCompare(String(b.label)))
}

export async function fetchCheckpointRows(): Promise<CheckpointRow[]> {
  const [viewRes, entityRes] = await Promise.all([
    http.post(endpoints.checkPointView.getList, {}),
    // cố gắng lấy status từ entity list (nếu backend trả cpStatus)
    http.post(endpoints.checkPoint.getList, {}).catch(() => null as any),
  ])

  const views = ensureSuccess<ApiCheckPointView[]>(viewRes.data).data ?? []

  const statusMap = new Map<number, number>()
  if (entityRes?.data) {
    try {
      const entities = ensureSuccess<ApiCheckPointEntity[]>(entityRes.data).data ?? []
      for (const e of entities) {
        if (!e?.cpId) continue
        if (typeof e.cpStatus === 'number') statusMap.set(e.cpId, apiStatusToUi(e.cpStatus))
      }
    } catch {
      // ignore nếu backend getlist không trả đúng shape
    }
  }

  return views
    .map((v) => {
      const status = statusMap.get(v.cpId) ?? 1
      const keyword = String(v.cpKeyword ?? '')
      const areaCode = String(v.areaCode ?? '')
      const areaName = String(v.areaName ?? '')

      return {
        cp_id: v.cpId,
        cp_code: v.cpCode,
        cp_name: v.cpName,
        cp_qr: String(v.cpQr ?? ''),
        cp_description: String(v.cpDescription ?? ''),
        cp_priority: Number(v.cpPriority ?? 1),
        cp_status: status,
        area_id: Number(v.areaId ?? 0),
        area_code: areaCode,
        area_name: areaName,
        created_at: v.createdAt ?? nowIso(),
        updated_at: v.updatedAt ?? nowIso(),
        _q: normalizeSearch({
          cp_keyword: keyword,
          cp_code: v.cpCode,
          cp_name: v.cpName,
          cp_description: String(v.cpDescription ?? ''),
          area_code: areaCode,
          area_name: areaName,
        }),
      }
    })
    .sort((a, b) => a.cp_code.localeCompare(b.cp_code))
}

export async function createCheckpointMock(payload: {
  cp_code: string
  cp_name: string
  cp_description: string
  cp_priority: number
  area_id: number
  actor_id: string
}) {
  const body = {
    cpCode: payload.cp_code.trim(),
    cpName: payload.cp_name.trim(),
    cpDescription: payload.cp_description.trim(),
    cpPriority: Number(payload.cp_priority ?? 1),
    areaId: Number(payload.area_id ?? 0),
    createdBy: payload.actor_id,
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.post(endpoints.checkPoint.create, body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function updateCheckpointMock(payload: {
  cp_id: number
  cp_code: string
  cp_name: string
  cp_description: string
  cp_priority: number
  area_id: number
  actor_id: string
}) {
  const body = {
    cpCode: payload.cp_code.trim(),
    cpName: payload.cp_name.trim(),
    cpDescription: payload.cp_description.trim(),
    cpPriority: Number(payload.cp_priority ?? 1),
    areaId: Number(payload.area_id ?? 0),
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.patch(endpoints.checkPoint.update(payload.cp_id), body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function deleteCheckpointMock(payload: { cp_id: number; actor_id: string }) {
  const body = { updatedBy: payload.actor_id }

  try {
    const res = await http.delete(endpoints.checkPoint.delete(payload.cp_id), { data: body })
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}
