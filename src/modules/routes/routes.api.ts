import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { AreaOption, RouteDetailModel, RouteRow, ScanPointOption } from './routes.types'

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

type ApiRouteDetail = {
  rdId?: number
  routeId: number
  cpId: number
  cpCode: string
  cpName: string
  rdSecond: number
  rdPriority: number
}

type ApiRouteView = {
  routeId: number
  routeStatus: number
  routeKeyword?: string
  routeCode: string
  routeName: string
  routeTotalSecond: number
  areaId: number
  areaCode?: string
  areaName?: string
  routePriority: number
  createdAt?: string
  updatedAt?: string
  routeDetails?: ApiRouteDetail[]
}

type ApiCheckPointView = {
  cpId: number
  cpCode: string
  cpName: string
  areaId: number
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

// Backend: 0 active. UI: 1 active.
function apiStatusToUi(status?: number) {
  if (status == null) return 1
  return status === 0 ? 1 : 0
}

export function sumSeconds(details: RouteDetailModel[]) {
  return (details ?? []).reduce((acc, d) => acc + (Number(d.rd_second) || 0), 0)
}

export async function fetchAreaOptions(): Promise<AreaOption[]> {
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

export async function fetchScanPointsByArea(areaId: number): Promise<ScanPointOption[]> {
  const res = await http.post(endpoints.checkPointView.getList, { areaId })
  const env = ensureSuccess<ApiCheckPointView[]>(res.data)
  const list = env.data ?? []

  return list
    .map((cp) => ({
      value: cp.cpId,
      cpCode: cp.cpCode,
      cpName: cp.cpName,
      label: `${cp.cpCode} - ${cp.cpName}`,
    }))
    .sort((a, b) => a.cpCode.localeCompare(b.cpCode))
}

export async function fetchRouteRows(): Promise<RouteRow[]> {
  const res = await http.post(endpoints.routeView.getList, {})
  const env = ensureSuccess<ApiRouteView[]>(res.data)
  const views = env.data ?? []

  return views
    .map((v) => {
      const details = (v.routeDetails ?? [])
        .slice()
        .sort((a, b) => Number(a.rdPriority) - Number(b.rdPriority))
        .map<RouteDetailModel>((d) => ({
          cp_id: d.cpId,
          cp_code: d.cpCode,
          cp_name: d.cpName,
          rd_second: Number(d.rdSecond ?? 0),
          rd_priority: Number(d.rdPriority ?? 0),
        }))

      return {
        route_id: v.routeId,
        route_code: v.routeCode,
        route_name: v.routeName,
        route_status: apiStatusToUi(v.routeStatus),
        route_priority: Number(v.routePriority ?? 0),
        route_total_second: Number(v.routeTotalSecond ?? sumSeconds(details)),

        area_id: Number(v.areaId ?? 0),
        area_code: String(v.areaCode ?? ''),
        area_name: String(v.areaName ?? ''),

        details,
        details_count: details.length,

        created_at: v.createdAt ?? nowIso(),
        updated_at: v.updatedAt ?? nowIso(),
        _q: String(v.routeKeyword ?? `${v.routeCode} ${v.routeName}`).toLowerCase(),
      }
    })
    .sort((a, b) => a.route_code.localeCompare(b.route_code))
}

export async function createRouteMock(payload: {
  route_code: string
  route_name: string
  area_id: number
  route_priority: number
  details: RouteDetailModel[]
  actor_id: string
}) {
  const details = (payload.details ?? []).map((d, idx) => ({
    cpId: d.cp_id,
    rdSecond: Number(d.rd_second ?? 0),
    rdPriority: idx + 1,
    createdBy: payload.actor_id,
  }))

  const body = {
    routeCode: payload.route_code.trim(),
    routeName: payload.route_name.trim(),
    routeTotalSecond: sumSeconds(payload.details),
    areaId: payload.area_id,
    routePriority: Number(payload.route_priority ?? 0),
    createdBy: payload.actor_id,
    updatedBy: payload.actor_id,
    routeDetails: details,
  }

  try {
    const res = await http.post(endpoints.route.create, body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function updateRouteMock(payload: {
  route_id: number
  route_code: string
  route_name: string
  area_id: number
  route_priority: number
  details: RouteDetailModel[]
  actor_id: string
}) {
  const details = (payload.details ?? []).map((d, idx) => ({
    cpId: d.cp_id,
    rdSecond: Number(d.rd_second ?? 0),
    rdPriority: idx + 1,
    createdBy: payload.actor_id,
  }))

  const body = {
    routeCode: payload.route_code.trim(),
    routeName: payload.route_name.trim(),
    routeTotalSecond: sumSeconds(payload.details),
    areaId: payload.area_id,
    routePriority: Number(payload.route_priority ?? 0),
    updatedBy: payload.actor_id,
    routeDetails: details,
  }

  try {
    const res = await http.patch(endpoints.route.update(payload.route_id), body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function deleteRouteMock(payload: { route_id: number; actor_id: string }) {
  const body = { updatedBy: payload.actor_id }

  try {
    const res = await http.delete(endpoints.route.delete(payload.route_id), { data: body })
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}
