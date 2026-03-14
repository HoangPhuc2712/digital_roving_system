import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { UserRow } from './users.types'
import { appConfig } from '@/config/app'

type ApiEnvelope<T> = {
  data: T
  success: boolean
  message: string
}

type ApiUserEntity = {
  userId: string
  userStatus?: number
  userName: string
  userCode: string
  userPassword?: string
  userRoleId: number
  userAreaId?: number
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

type ApiUserView = {
  userId: string
  userKeyword?: string
  userName?: string
  userCode?: string
  userPassword?: string

  userRoleId?: number
  userRoleCode?: string
  userRoleName?: string
  userRoleHourReport?: boolean
  userRoleIsAdmin?: boolean

  userAreaId?: number
  userAreaCode?: string
  userAreaName?: string

  createdAt?: string
  createdBy?: string
  createdName?: string
  updatedAt?: string
  updatedBy?: string
  updatedName?: string

  allowViews?: any[]
}

type ApiRoleBase = { roleId: number; roleCode?: string; roleName?: string }

type ApiAreaBase = { areaId: number; areaCode?: string; areaName?: string }

function nowIso() {
  return new Date().toISOString()
}

function normalizeSearch(u: {
  user_name: string
  user_code: string
  role_name: string
  role_code: string
  area_name: string
  area_code: string
}) {
  return `${u.user_name} ${u.user_code} ${u.role_name} ${u.role_code} ${u.area_name} ${u.area_code}`.toLowerCase()
}

function ensureSuccess<T>(envelope: any): ApiEnvelope<T> {
  const e = envelope as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) {
    const msg = String((e as any).message ?? '')
    if (msg.toLowerCase().includes('mã') && msg.toLowerCase().includes('tồn')) {
      throw new Error('USER_CODE_EXISTS')
    }
    if (msg.toLowerCase().includes('code') && msg.toLowerCase().includes('exist')) {
      throw new Error('USER_CODE_EXISTS')
    }
    throw new Error(msg || 'API_ERROR')
  }
  return e
}

function apiStatusToUi(status?: number) {
  // Backend: 0 = Active. Frontend (mock): 1 = Active.
  if (status == null) return 1
  if (status === 0) return 1
  if (status < 0) return status
  return 0
}

async function safeGetUserEntity(userId: string): Promise<ApiUserEntity | null> {
  try {
    const res = await http.get(endpoints.user.getOne(userId))
    const payload = res?.data
    const env = ensureSuccess<ApiUserEntity>(payload)
    return env.data ?? null
  } catch {
    return null
  }
}

async function fetchUserStatusMap() {
  try {
    const entityRes = await http.post(endpoints.user.getList, {})
    const entities = ensureSuccess<ApiUserEntity[] | ApiUserEntity>(entityRes.data).data ?? []
    const list = Array.isArray(entities) ? entities : [entities]

    const statusMap = new Map<string, number>()
    for (const e of list) {
      const id = String(e?.userId ?? '').trim()
      if (!id) continue
      statusMap.set(id, apiStatusToUi(e.userStatus))
    }
    return statusMap
  } catch {
    return new Map<string, number>()
  }
}

async function resolveUserAreaId(userId: string): Promise<number> {
  const fromApi = await safeGetUserEntity(userId)
  const apiAreaId = fromApi?.userAreaId
  if (typeof apiAreaId === 'number' && apiAreaId > 0) return apiAreaId

  const fallback = Number(appConfig.defaultAreaId ?? 0)
  if (fallback > 0) return fallback

  return 1
}

export async function fetchUserRows(): Promise<UserRow[]> {
  const [statusMap, viewRes] = await Promise.all([
    fetchUserStatusMap(),
    http.post(endpoints.userView.getList, {}),
  ])

  const payload = ensureSuccess<ApiUserView[] | ApiUserView>(viewRes.data).data ?? []
  const views = Array.isArray(payload) ? payload : [payload]

  return views
    .map((v) => {
      const userId = String(v.userId ?? '')
      const userName = String(v.userName ?? '')
      const userCode = String(v.userCode ?? '')

      const roleId = Number(v.userRoleId ?? 0)
      const roleName = String(v.userRoleName ?? '')
      const roleCode = String(v.userRoleCode ?? '')

      const areaId = Number(v.userAreaId ?? 0)
      const areaName = String(v.userAreaName ?? '')
      const areaCode = String(v.userAreaCode ?? '')

      const status = statusMap.get(userId) ?? 1

      return {
        user_id: userId,
        user_name: userName,
        user_code: userCode,

        user_role_id: roleId,
        role_name: roleName,
        role_code: roleCode,

        user_area_id: areaId,
        area_name: areaName,
        area_code: areaCode,

        user_status: status,
        created_date: v.createdAt ?? nowIso(),
        updated_date: v.updatedAt ?? nowIso(),

        _q: String(
          v.userKeyword ??
            normalizeSearch({
              user_name: userName,
              user_code: userCode,
              role_name: roleName,
              role_code: roleCode,
              area_name: areaName,
              area_code: areaCode,
            }),
        )
          .toLowerCase()
          .trim(),
      }
    })
    .sort((a, b) => a.user_name.localeCompare(b.user_name))
}

export async function fetchUserById(user_id: string) {
  const [entity, view] = await Promise.all([
    safeGetUserEntity(user_id),
    (async () => {
      try {
        const res = await http.get(endpoints.userView.getOne(user_id))
        const env = ensureSuccess<ApiUserView>(res.data)
        return env.data ?? null
      } catch {
        return null
      }
    })(),
  ])

  if (!view && !entity) return null

  const name = view?.userName ?? entity?.userName ?? ''
  const code = view?.userCode ?? entity?.userCode ?? ''
  const roleId = view?.userRoleId ?? entity?.userRoleId ?? 0

  return {
    user_id,
    user_name: String(view?.userName ?? entity?.userName ?? ''),
    user_code: String(view?.userCode ?? entity?.userCode ?? ''),
    user_role_id: Number(view?.userRoleId ?? entity?.userRoleId ?? 0),

    role_name: String(
      (view as any)?.userRoleName ??
        (view as any)?.roleName ??
        (view as any)?.userRoleCode ??
        (view as any)?.roleCode ??
        '',
    ),
    role_code: String((view as any)?.userRoleCode ?? (view as any)?.roleCode ?? ''),

    user_area_id: Number((view as any)?.userAreaId ?? entity?.userAreaId ?? 0),
    area_name: String((view as any)?.userAreaName ?? (view as any)?.areaName ?? ''),
    area_code: String((view as any)?.userAreaCode ?? (view as any)?.areaCode ?? ''),

    user_status: apiStatusToUi(entity?.userStatus),
    created_date: view?.createdAt ?? entity?.createdAt ?? nowIso(),
    updated_date: view?.updatedAt ?? entity?.updatedAt ?? nowIso(),
  }
}

export async function createUserMock(payload: {
  user_name: string
  user_code: string
  user_password: string
  user_role_id: number
  user_area_id: number
  actor_id: string
}) {
  const areaId = await resolveUserAreaId(payload.actor_id)

  const body: any = {
    userName: payload.user_name.trim(),
    userCode: payload.user_code.trim(),
    userPassword: payload.user_password,
    userRoleId: payload.user_role_id,
    userAreaId: payload.user_area_id, // ✅ dùng cái user chọn
    createdBy: payload.actor_id,
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.post(endpoints.user.create, body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function updateUserMock(payload: {
  user_id: string
  user_name: string
  user_code: string
  user_password?: string
  user_role_id: number
  user_area_id: number
  actor_id: string
}) {
  const currentEntity = await safeGetUserEntity(payload.user_id)
  const areaId =
    typeof currentEntity?.userAreaId === 'number' && currentEntity.userAreaId > 0
      ? currentEntity.userAreaId
      : await resolveUserAreaId(payload.actor_id)

  const body: any = {
    userName: payload.user_name.trim(),
    userCode: payload.user_code.trim(),
    userRoleId: payload.user_role_id,
    userAreaId: payload.user_area_id, // ✅ dùng cái user chọn
    updatedBy: payload.actor_id,
  }

  const pwd = (payload.user_password ?? '').trim()
  if (pwd) body.userPassword = pwd

  try {
    const res = await http.patch(endpoints.user.update(payload.user_id), body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function deleteUserMock(payload: { user_id: string; actor_id: string }) {
  const body = { updatedBy: payload.actor_id }

  try {
    const res = await http.delete(endpoints.user.delete(payload.user_id), { data: body })
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function fetchRoleOptions() {
  const res = await http.get(endpoints.role.getBaseList)
  const list = ensureSuccess<ApiRoleBase[]>(res.data).data ?? []

  return list
    .map((r) => ({
      value: Number(r.roleId ?? 0),
      label: String(r.roleName ?? r.roleCode ?? r.roleId),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export async function fetchAreaOptions() {
  const res = await http.get(endpoints.area.getBaseList)
  const list = ensureSuccess<ApiAreaBase[]>(res.data).data ?? []

  return list
    .map((a) => ({
      value: Number(a.areaId ?? 0),
      label: String(a.areaName ?? a.areaCode ?? a.areaId),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}
