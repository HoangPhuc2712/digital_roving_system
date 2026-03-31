import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type {
  AreaOption,
  RoleOption,
  RouteDetailModel,
  RouteRow,
  ScanPointOption,
} from './routes.types'

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

type ApiRoleBase = {
  roleId: number
  roleCode?: string
  roleName?: string
}

type ApiRouteDetail = {
  rdId?: number
  routeId: number
  cpId: number
  cpCode: string
  cpName: string
  cpPriority?: number
  rdSecond?: number
  rdPriority?: number
  rdMinute?: number
}

type ApiRouteView = {
  routeId: number
  routeStatus: number
  routeKeyword?: string
  routeCode: string
  routeName: string
  routeMaxMinute?: number
  routeMinMinute?: number
  areaId: number
  areaCode?: string
  areaName?: string
  roleId?: number
  roleCode?: string
  roleName?: string
  routePriority: number
  createdAt?: string
  updatedAt?: string
  routeDetails?: ApiRouteDetail[]
}

type ApiCheckPointView = {
  cpId: number
  cpCode: string
  cpName: string
  cpQr?: string
  cpPriority?: number
  areaId: number
  roleIdStr?: string
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

function parseRoleIds(roleIdStr?: string) {
  return String(roleIdStr ?? '')
    .split(/[;,|\s]+/)
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x) && x > 0)
}

function resolveRoleLabel(
  roleId: number,
  roleCode: string,
  roleName: string,
  roleOptions: RoleOption[],
) {
  if (roleName) return roleName
  if (roleCode) return roleCode
  return roleOptions.find((x) => x.value === roleId)?.label ?? ''
}

function toMinutes(value?: number, fallbackSeconds?: number) {
  const minute = Number(value ?? 0)
  if (Number.isFinite(minute) && minute > 0) return minute

  const sec = Number(fallbackSeconds ?? 0)
  if (Number.isFinite(sec) && sec > 0) return Math.ceil(sec / 60)

  return 0
}

async function fetchCheckpointMetaMap() {
  const res = await http.post(endpoints.checkPointView.getList, {})
  const env = ensureSuccess<ApiCheckPointView[] | ApiCheckPointView>(res.data)
  const list = Array.isArray(env.data) ? env.data : [env.data]

  const map = new Map<number, { cp_priority?: number; cp_qr: string }>()
  for (const cp of list) {
    const cpId = Number(cp.cpId ?? 0)
    if (!cpId) continue

    map.set(cpId, {
      cp_priority: Number(cp.cpPriority ?? 0) || undefined,
      cp_qr: String(cp.cpQr ?? ''),
    })
  }

  return map
}

function mapRouteDetails(
  details: ApiRouteDetail[],
  checkpointMetaMap: Map<number, { cp_priority?: number; cp_qr: string }> = new Map(),
): RouteDetailModel[] {
  return (details ?? [])
    .slice()
    .sort((a, b) => Number(a.rdPriority ?? 0) - Number(b.rdPriority ?? 0))
    .map<RouteDetailModel>((d) => {
      const cpId = Number(d.cpId ?? 0)
      const checkpointMeta = checkpointMetaMap.get(cpId)

      return {
        cp_id: cpId,
        cp_code: String(d.cpCode ?? ''),
        cp_name: String(d.cpName ?? ''),
        cp_qr: String(checkpointMeta?.cp_qr ?? ''),
        cp_priority: Number(d.cpPriority ?? checkpointMeta?.cp_priority ?? 0) || undefined,
        rd_minute: toMinutes(d.rdMinute, d.rdSecond),
        rd_priority: Number(d.rdPriority ?? 0),
      }
    })
}

function mapRouteView(
  v: ApiRouteView,
  roleOptions: RoleOption[] = [],
  checkpointMetaMap: Map<number, { cp_priority?: number; cp_qr: string }> = new Map(),
): RouteRow {
  const details = mapRouteDetails(v.routeDetails ?? [], checkpointMetaMap)
  const roleId = Number(v.roleId ?? 0)
  const roleCode = String(v.roleCode ?? '')
  const roleName = resolveRoleLabel(roleId, roleCode, String(v.roleName ?? ''), roleOptions)
  const MinMinute = Number(v.routeMinMinute ?? 0)
  const maxMinute = Number(v.routeMaxMinute ?? 0)

  return {
    route_id: Number(v.routeId ?? 0),
    route_code: String(v.routeCode ?? ''),
    route_name: String(v.routeName ?? ''),
    route_status: apiStatusToUi(v.routeStatus),
    route_priority: Number(v.routePriority ?? 0),
    route_min_minute: Number(v.routeMinMinute ?? 0),
    route_max_minute: Number(v.routeMaxMinute ?? 0),

    area_id: Number(v.areaId ?? 0),
    area_code: String(v.areaCode ?? ''),
    area_name: String(v.areaName ?? ''),

    role_id: roleId,
    role_code: roleCode,
    role_name: roleName,

    details,
    details_count: details.length,

    created_at: v.createdAt ?? nowIso(),
    updated_at: v.updatedAt ?? nowIso(),
    _q: String(
      v.routeKeyword ??
        `${v.routeCode ?? ''} ${v.routeName ?? ''} ${v.areaCode ?? ''} ${v.areaName ?? ''} ${roleCode} ${roleName}`,
    )
      .toLowerCase()
      .trim(),
  }
}

export function sumSeconds(details: RouteDetailModel[]) {
  return (details ?? []).reduce((acc, d) => acc + (Number(d.rd_minute) || 0) * 60, 0)
}

export async function fetchAreaOptions(): Promise<AreaOption[]> {
  const res = await http.post(endpoints.area.getBaseList, {})
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

export async function fetchRoleOptions(): Promise<RoleOption[]> {
  const res = await http.post(endpoints.role.getBaseList, {})
  const env = ensureSuccess<ApiRoleBase[]>(res.data)
  const list = env.data ?? []

  return list
    .map((r) => ({
      value: Number(r.roleId ?? 0),
      label: String(r.roleName ?? r.roleCode ?? r.roleId),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export async function fetchScanPointsByArea(
  areaId: number,
  roleId?: number | null,
): Promise<ScanPointOption[]> {
  if (!roleId) return []

  const res = await http.post(endpoints.checkPointView.getList, {})
  const env = ensureSuccess<ApiCheckPointView[]>(res.data)
  const list = env.data ?? []

  return list
    .filter((cp) => {
      const ids = parseRoleIds(cp.roleIdStr)
      return ids.includes(Number(roleId))
    })
    .map((cp) => ({
      value: Number(cp.cpId ?? 0),
      cpCode: String(cp.cpCode ?? ''),
      cpName: String(cp.cpName ?? ''),
      cpQr: String(cp.cpQr ?? ''),
      cpPriority: Number(cp.cpPriority ?? 0) || undefined,
      areaId: Number(cp.areaId ?? 0),
      label: `${cp.cpCode ?? cp.cpId} - ${cp.cpName ?? ''}`,
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => a.cpCode.localeCompare(b.cpCode))
}

export async function fetchRouteRows(roleOptions: RoleOption[] = []): Promise<RouteRow[]> {
  const [checkpointMetaMap, res] = await Promise.all([
    fetchCheckpointMetaMap().catch(
      () => new Map<number, { cp_priority?: number; cp_qr: string }>(),
    ),
    http.post(endpoints.routeView.getList, {}),
  ])

  const payload = ensureSuccess<ApiRouteView[] | ApiRouteView>(res.data).data ?? []
  const views = Array.isArray(payload) ? payload : [payload]

  return views
    .map((v) => mapRouteView(v, roleOptions, checkpointMetaMap))
    .sort((a, b) => a.route_code.localeCompare(b.route_code))
}

export async function fetchRouteById(routeId: number, roleOptions: RoleOption[] = []) {
  const [checkpointMetaMap, res] = await Promise.all([
    fetchCheckpointMetaMap().catch(
      () => new Map<number, { cp_priority?: number; cp_qr: string }>(),
    ),
    http.get(endpoints.routeView.getOne(routeId)),
  ])

  const data = ensureSuccess<ApiRouteView>(res.data).data
  const row = mapRouteView(data, roleOptions, checkpointMetaMap)

  return {
    route_id: row.route_id,
    route_code: row.route_code,
    route_name: row.route_name,
    area_id: row.area_id,
    role_id: row.role_id,
    role_name: row.role_name,
    route_priority: row.route_priority,
    route_min_minute: row.route_min_minute,
    route_max_minute: row.route_max_minute,
    details: row.details.map((d) => ({ ...d })),
  }
}

export async function createRouteMock(payload: {
  route_name: string
  area_id: number
  role_id: number
  route_priority: number
  route_min_minute: number
  route_max_minute: number
  details: RouteDetailModel[]
  actor_id: string
}) {
  const details = (payload.details ?? []).map((d, idx) => ({
    cpId: d.cp_id,
    rdMinute: Number(d.rd_minute ?? 0),
    rdPriority: idx + 1,
    createdBy: payload.actor_id,
  }))

  const body = {
    routeName: payload.route_name.trim(),
    routeMinMinute: Number(payload.route_min_minute ?? 0),
    routeMaxMinute: Number(payload.route_max_minute ?? 0),
    areaId: payload.area_id,
    roleId: Number(payload.role_id ?? 0),
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
  route_name: string
  area_id: number
  role_id: number
  route_priority: number
  route_min_minute: number
  route_max_minute: number
  details: RouteDetailModel[]
  actor_id: string
}) {
  const details = (payload.details ?? []).map((d, idx) => ({
    cpId: d.cp_id,
    rdMinute: Number(d.rd_minute ?? 0),
    rdPriority: idx + 1,
    createdBy: payload.actor_id,
  }))

  const body = {
    routeName: payload.route_name.trim(),
    routeMinMinute: Number(payload.route_min_minute ?? 0),
    routeMaxMinute: Number(payload.route_max_minute ?? 0),
    areaId: payload.area_id,
    roleId: Number(payload.role_id ?? 0),
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

export async function createPatrolShiftsByTime(payload: {
  month: number
  year: number
  createdBy: string
}): Promise<boolean> {
  const res = await http.post(endpoints.patrolShift.createByTime, payload)
  const env = ensureSuccess<boolean>(res.data)
  return Boolean(env.data)
}
