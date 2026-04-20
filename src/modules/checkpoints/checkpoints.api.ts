import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { CheckpointRow, AreaOption, RoleOption } from './checkpoints.types'

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

type ApiCheckPointView = {
  cpId: number
  cpStatus?: number
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
  roleIdStr?: string
  roleNames?: string[]
  roleNameStr?: string
}

type ApiRoleBase = {
  roleId: number
  roleCode?: string
  roleName?: string
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
  role_names: string[]
}) {
  return `${x.cp_keyword} ${x.cp_code} ${x.cp_name} ${x.cp_description} ${x.area_code} ${x.area_name} ${x.role_names.join(' ')}`
    .toLowerCase()
    .trim()
}

function parseRoleIds(roleIdStr?: string): number[] {
  return String(roleIdStr ?? '')
    .split(/[;,|\s]+/)
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x) && x > 0)
}

function buildRoleNames(roleIds: number[], roleOptions: RoleOption[]) {
  const map = new Map(roleOptions.map((x) => [x.value, x.label]))
  return roleIds.map((id) => map.get(id) ?? String(id))
}

function extractRoleNames(
  view: Pick<ApiCheckPointView, 'roleNames' | 'roleNameStr' | 'roleIdStr'>,
  roleOptions: RoleOption[],
) {
  if (Array.isArray(view.roleNames) && view.roleNames.length > 0) {
    return view.roleNames.map((name) => String(name ?? '').trim()).filter(Boolean)
  }

  const roleNameStr = String(view.roleNameStr ?? '').trim()
  if (roleNameStr) {
    return roleNameStr
      .split(/[;,|]+/)
      .map((name) => String(name ?? '').trim())
      .filter(Boolean)
  }

  const roleIds = parseRoleIds(view.roleIdStr)
  if (roleOptions.length > 0) {
    return buildRoleNames(roleIds, roleOptions)
  }

  return roleIds.map((id) => String(id))
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
  const list = ensureSuccess<ApiRoleBase[]>(res.data).data ?? []

  return list
    .map((r) => ({
      value: Number(r.roleId ?? 0),
      label: String(r.roleName ?? r.roleCode ?? r.roleId),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export async function fetchCheckpointRows(
  roleOptions: RoleOption[] = [],
): Promise<CheckpointRow[]> {
  const viewRes = await http.post(endpoints.checkPointView.getList, {})
  const views = ensureSuccess<ApiCheckPointView[]>(viewRes.data).data ?? []

  return views
    .map((v) => {
      const status = apiStatusToUi(v.cpStatus)
      const keyword = String(v.cpKeyword ?? '')
      const areaCode = String(v.areaCode ?? '')
      const areaName = String(v.areaName ?? '')
      const roleIdStr = String(v.roleIdStr ?? '').trim()
      const roleIds = parseRoleIds(roleIdStr)
      const roleNames = extractRoleNames(v, roleOptions)

      return {
        cp_id: v.cpId,
        cp_code: v.cpCode,
        cp_name: v.cpName,
        cp_keyword: keyword,
        cp_qr: String(v.cpQr ?? ''),
        cp_description: String(v.cpDescription ?? ''),
        cp_priority: Number(v.cpPriority ?? 1),
        cp_status: status,
        area_id: Number(v.areaId ?? 0),
        area_code: areaCode,
        area_name: areaName,
        role_id_str: roleIdStr,
        role_ids: roleIds,
        role_names: roleNames,
        created_at: v.createdAt ?? nowIso(),
        updated_at: v.updatedAt ?? nowIso(),
        _q: normalizeSearch({
          cp_keyword: keyword,
          cp_code: v.cpCode,
          cp_name: v.cpName,
          cp_description: String(v.cpDescription ?? ''),
          area_code: areaCode,
          area_name: areaName,
          role_names: roleNames,
        }),
      }
    })
    .sort((a, b) => a.cp_code.localeCompare(b.cp_code))
}

export async function fetchCheckpointById(cp_id: number, roleOptions: RoleOption[] = []) {
  const res = await http.get(endpoints.checkPointView.getOne(cp_id))
  const v = ensureSuccess<ApiCheckPointView>(res.data).data
  const roleIdStr = String(v.roleIdStr ?? '').trim()
  const roleIds = parseRoleIds(roleIdStr)
  const roleNames = extractRoleNames(v, roleOptions)

  return {
    cp_id: v.cpId,
    cp_code: String(v.cpCode ?? ''),
    cp_name: String(v.cpName ?? ''),
    cp_qr: String(v.cpQr ?? ''),
    cp_description: String(v.cpDescription ?? ''),
    cp_priority: Number(v.cpPriority ?? 1),
    area_id: Number(v.areaId ?? 0),
    area_code: String(v.areaCode ?? ''),
    area_name: String(v.areaName ?? ''),
    role_id_str: roleIdStr,
    role_ids: roleIds,
    role_names: roleNames,
  }
}

export async function createCheckpointMock(payload: {
  cp_name: string
  cp_description: string
  cp_priority: number
  area_id: number
  role_ids: number[]
  actor_id: string
}) {
  const body = {
    cpName: payload.cp_name.trim(),
    cpDescription: payload.cp_description.trim(),
    cpPriority: Number(payload.cp_priority ?? 1),
    areaId: Number(payload.area_id ?? 0),
    roleIdStr: payload.role_ids.map((x) => String(x)).join(','),
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
  cp_name: string
  cp_description: string
  cp_priority: number
  area_id: number
  role_ids: number[]
  actor_id: string
}) {
  const body = {
    cpName: payload.cp_name.trim(),
    cpDescription: payload.cp_description.trim(),
    cpPriority: Number(payload.cp_priority ?? 1),
    areaId: Number(payload.area_id ?? 0),
    roleIdStr: payload.role_ids.map((x) => String(x)).join(','),
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
