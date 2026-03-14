import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { MenuCategoryOption, RoleRow } from './roles.types'

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

type ApiRoleMenu = {
  rmcId: number
  roleId: number
  mcId: number
  mcCode: string
  mcName: string
  mcActive: boolean
}

type ApiRoleView = {
  roleId: number
  roleStatus: number
  roleKeyword?: string
  roleCode: string
  roleName: string
  roleHourReport?: boolean
  roleIsAdmin?: boolean
  createdAt?: string
  createdBy?: string
  createdName?: string
  updatedAt?: string
  updatedBy?: string
  updatedName?: string
  roleMenus?: ApiRoleMenu[]
}

type ApiRmcViewRow = {
  rmcId: number
  roleId: number
  roleCode: string
  roleName: string
  mcId: number
  mcCode: string
  mcName: string
  mcActive: boolean
  mcPriority: number
}

function nowIso() {
  return new Date().toISOString()
}

function apiStatusToUi(status?: number) {
  // Backend: 0 = Active. UI: 1 = Active.
  if (status == null) return 1
  return status === 0 ? 1 : 0
}

function unwrapEnvelope<T>(payload: any): T {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const e = payload as ApiEnvelope<T>
    if (!e.success) throw new Error(String(e.message ?? 'API_ERROR') || 'API_ERROR')
    return e.data
  }
  return payload as T
}

function unwrapList<T>(payload: any): T[] {
  const unwrapped = unwrapEnvelope<any>(payload)
  if (Array.isArray(unwrapped)) return unwrapped
  if (unwrapped && Array.isArray(unwrapped.data)) return unwrapped.data
  return []
}

export async function fetchMenuCategoryOptions(): Promise<MenuCategoryOption[]> {
  const res = await http.post(endpoints.roleMenuCategoryView.getList, {})
  const rows = unwrapList<ApiRmcViewRow>(res.data)

  const map = new Map<number, MenuCategoryOption>()
  for (const r of rows) {
    if (!r?.mcId) continue
    if (!map.has(r.mcId)) {
      map.set(r.mcId, {
        value: r.mcId,
        label: r.mcName,
        code: r.mcCode,
        priority: Number(r.mcPriority ?? 0),
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.priority || 0) - (b.priority || 0))
}

export async function fetchRoleRows(): Promise<RoleRow[]> {
  const res = await http.post(endpoints.roleView.getList, {})
  const views = unwrapList<ApiRoleView>(res.data)

  return (views ?? [])
    .map((v) => {
      const menus = v.roleMenus ?? []
      const menuIds = menus.map((m) => m.mcId).filter((x) => typeof x === 'number')
      const menuNames = menus.map((m) => m.mcName).filter(Boolean)

      const q = String(v.roleKeyword ?? `${v.roleCode} ${v.roleName}`).toLowerCase()

      return {
        role_id: v.roleId,
        role_code: v.roleCode,
        role_name: v.roleName,
        role_hour_report: Boolean(v.roleHourReport),
        role_is_admin: Boolean(v.roleIsAdmin),
        role_status: apiStatusToUi(v.roleStatus),
        created_date: v.createdAt ?? nowIso(),
        updated_date: v.updatedAt ?? nowIso(),
        menu_ids: menuIds,
        menu_names: menuNames,
        menu_count: menuIds.length,
        _q: q,
      }
    })
    .sort((a, b) => a.role_name.localeCompare(b.role_name))
}

export async function fetchRoleById(role_id: number) {
  const res = await http.get(endpoints.roleView.getOne(role_id))
  const data = unwrapEnvelope<ApiRoleView>(res.data)

  const menus = data.roleMenus ?? []
  return {
    role_id: data.roleId,
    role_code: data.roleCode,
    role_name: data.roleName,
    role_hour_report: Boolean(data.roleHourReport),
    role_is_admin: Boolean(data.roleIsAdmin),
    role_status: apiStatusToUi(data.roleStatus),
    menu_ids: menus.map((m) => m.mcId),
  }
}

export async function createRole(payload: {
  role_name: string
  role_hour_report: boolean
  role_is_admin: boolean
  mc_ids: number[]
  actor_id: string
}) {
  const body = {
    roleName: payload.role_name.trim(),
    roleHourReport: Boolean(payload.role_hour_report),
    roleIsAdmin: Boolean(payload.role_is_admin),
    mcIds: payload.mc_ids,
    createdBy: payload.actor_id,
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.post(endpoints.role.create, body)
    const ok = unwrapEnvelope<boolean>(res.data)
    return ok === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function updateRole(payload: {
  role_id: number
  role_name: string
  role_hour_report: boolean
  role_is_admin: boolean
  mc_ids: number[]
  actor_id: string
}) {
  const body = {
    roleName: payload.role_name.trim(),
    roleHourReport: Boolean(payload.role_hour_report),
    roleIsAdmin: Boolean(payload.role_is_admin),
    mcIds: payload.mc_ids,
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.patch(endpoints.role.update(payload.role_id), body)
    const ok = unwrapEnvelope<boolean>(res.data)
    return ok === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function deleteRole(payload: { role_id: number; actor_id: string }) {
  const body = { updatedBy: payload.actor_id }

  try {
    const res = await http.delete(endpoints.role.delete(payload.role_id), { data: body })
    const ok = unwrapEnvelope<boolean>(res.data)
    return ok === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}
