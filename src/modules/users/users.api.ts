import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { UserRow } from './users.types'

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
  userName: string
  userCode: string
  userPassword?: string
  userRoleId: number
  roleCode?: string
  roleName?: string
  userAreaId?: number
  areaCode?: string
  areaName?: string
  createdAt?: string
  createdBy?: string
  createdName?: string
  updatedAt?: string
  updatedBy?: string
  updatedName?: string
  allowViews?: any[]
}

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

function uiStatusToApi(status: number) {
  // UI: 1 active -> API: 0 active
  if (status === 1) return 0
  if (status < 0) return status
  return 1
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

async function resolveUserAreaId(userId: string): Promise<number> {
  const fromApi = await safeGetUserEntity(userId)
  const apiAreaId = fromApi?.userAreaId
  if (typeof apiAreaId === 'number' && apiAreaId > 0) return apiAreaId

  const fallback = Number(import.meta.env.VITE_DEFAULT_AREA_ID ?? 0)
  if (fallback > 0) return fallback

  return 1
}

export async function fetchUserRows(): Promise<UserRow[]> {
  const [entityRes, viewRes] = await Promise.all([
    http.post(endpoints.user.getList, {}),
    http.post(endpoints.userView.getList, {}),
  ])

  const entities = ensureSuccess<ApiUserEntity[]>(entityRes.data).data ?? []
  const views = ensureSuccess<ApiUserView[]>(viewRes.data).data ?? []

  const statusMap = new Map<string, number>()
  for (const e of entities) {
    if (!e?.userId) continue
    statusMap.set(e.userId, apiStatusToUi(e.userStatus))
  }

  return views
    .map((v) => {
      const roleName = (v as any).roleName ?? (v as any).userRoleName ?? ''
      const roleCode = (v as any).roleCode ?? (v as any).userRoleCode ?? ''

      const areaName = (v as any).areaName ?? (v as any).userAreaName ?? ''
      const areaCode = (v as any).areaCode ?? (v as any).userAreaCode ?? ''
      const areaId = (v as any).userAreaId ?? 0
      const status = statusMap.get(v.userId) ?? 1

      return {
        user_id: v.userId,
        user_name: v.userName,
        user_code: v.userCode,
        user_role_id: v.userRoleId,
        role_name: roleName,
        role_code: roleCode,

        user_area_id: areaId,
        area_name: areaName,
        area_code: areaCode,

        user_status: status,
        created_date: v.createdAt ?? nowIso(),
        updated_date: v.updatedAt ?? nowIso(),
        _q: normalizeSearch({
          user_name: v.userName,
          user_code: v.userCode,
          role_name: roleName,
          role_code: roleCode,
          area_name: areaName,
          area_code: areaCode,
        }),
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
    user_name: name,
    user_code: code,
    user_role_id: roleId,
    role_name:
      (view as any)?.roleName ?? (view as any)?.userRoleName ?? (view as any)?.roleCode ?? '',
    role_code: (view as any)?.roleCode ?? (view as any)?.userRoleCode ?? '',

    user_area_id: (view as any)?.userAreaId ?? entity?.userAreaId ?? 0,
    area_name: (view as any)?.areaName ?? (view as any)?.userAreaName ?? '',
    area_code: (view as any)?.areaCode ?? (view as any)?.userAreaCode ?? '',

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
  actor_id: string
}) {
  const areaId = await resolveUserAreaId(payload.actor_id)

  const body: any = {
    userName: payload.user_name.trim(),
    userCode: payload.user_code.trim(),
    userPassword: payload.user_password,
    userRoleId: payload.user_role_id,
    userAreaId: areaId,
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
    userAreaId: areaId,
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
  // Until Roles module is connected, derive role options from UserView list
  const res = await http.post(endpoints.userView.getList, {})
  const views = ensureSuccess<ApiUserView[]>(res.data).data ?? []

  const map = new Map<number, string>()
  for (const v of views) {
    if (!v?.userRoleId) continue
    const label =
      (v as any).roleName ??
      (v as any).userRoleName ??
      (v as any).roleCode ??
      (v as any).userRoleCode ??
      String(v.userRoleId)
    if (!map.has(v.userRoleId)) map.set(v.userRoleId, label)
  }

  return Array.from(map.entries())
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
