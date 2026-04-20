import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { UserRow } from './users.types'

type ApiEnvelope<T> = {
  data: T
  success: boolean
  message: string
}

type ApiUserView = {
  userId: string
  userStatus?: number
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

function nowIso() {
  return new Date().toISOString()
}

function normalizeSearch(u: {
  user_name: string
  user_code: string
  user_keyword: string
  role_name: string
  role_code: string
  area_name: string
  area_code: string
}) {
  return `${u.user_name} ${u.user_code} ${u.user_keyword} ${u.role_name} ${u.role_code} ${u.area_name} ${u.area_code}`.toLowerCase()
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

export async function fetchUserRows(): Promise<UserRow[]> {
  const viewRes = await http.post(endpoints.userView.getList, {})

  const payload = ensureSuccess<ApiUserView[] | ApiUserView>(viewRes.data).data ?? []
  const views = Array.isArray(payload) ? payload : [payload]

  return views
    .map((v) => {
      const userId = String(v.userId ?? '')
      const userName = String(v.userName ?? '')
      const userCode = String(v.userCode ?? '')
      const userKeyword = String(v.userKeyword ?? '')

      const roleId = Number(v.userRoleId ?? 0)
      const roleName = String(v.userRoleName ?? '')
      const roleCode = String(v.userRoleCode ?? '')

      const areaId = Number(v.userAreaId ?? 0)
      const areaName = String(v.userAreaName ?? '')
      const areaCode = String(v.userAreaCode ?? '')

      const status = apiStatusToUi((v as any)?.userStatus ?? (v as any)?.user_status)

      return {
        user_id: userId,
        user_name: userName,
        user_code: userCode,
        user_keyword: userKeyword,

        user_role_id: roleId,
        role_name: roleName,
        role_code: roleCode,

        user_area_id: areaId,
        area_name: areaName,
        area_code: areaCode,

        user_status: status,
        created_date: v.createdAt ?? nowIso(),
        updated_date: v.updatedAt ?? nowIso(),

        _q: normalizeSearch({
          user_name: userName,
          user_code: userCode,
          user_keyword: userKeyword,
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
  const res = await http.get(endpoints.userView.getOne(user_id))
  const view = ensureSuccess<ApiUserView>(res.data).data

  return {
    user_id,
    user_name: String(view?.userName ?? ''),
    user_code: String(view?.userCode ?? ''),
    user_role_id: Number(view?.userRoleId ?? 0),

    role_name: String(view?.userRoleName ?? view?.userRoleCode ?? ''),
    role_code: String(view?.userRoleCode ?? ''),

    user_area_id: Number(view?.userAreaId ?? 0),
    area_name: String(view?.userAreaName ?? ''),
    area_code: String(view?.userAreaCode ?? ''),

    user_status: apiStatusToUi((view as any)?.userStatus ?? (view as any)?.user_status),
    created_date: view?.createdAt ?? nowIso(),
    updated_date: view?.updatedAt ?? nowIso(),
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

type ApiAreaViewOption = { areaId?: number; areaCode?: string; areaName?: string }

export async function fetchAreaOptions() {
  const res = await http.post(endpoints.areaView.getList, {})
  const list = ensureSuccess<ApiAreaViewOption[] | ApiAreaViewOption>(res.data).data ?? []
  const views = Array.isArray(list) ? list : [list]

  return views
    .map((a) => ({
      value: Number(a.areaId ?? 0),
      label: String(a.areaName ?? a.areaCode ?? a.areaId),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export async function validateCurrentUserPassword(payload: {
  user_code: string
  current_password: string
}) {
  const validateRes = await http.post(endpoints.user.validate, {
    userCode: payload.user_code.trim(),
    userPassword: payload.current_password,
  })

  const validatePayload = validateRes?.data
  if (!validatePayload?.success) {
    const msg = String(validatePayload?.message ?? '')
    throw new Error(msg || 'CURRENT_PASSWORD_INCORRECT')
  }

  return true
}

export async function changeCurrentUserPassword(payload: {
  user_id: string
  user_code: string
  current_password: string
  new_password: string
  actor_id: string
}) {
  try {
    const res = await http.patch(endpoints.user.changePassword(payload.user_id), {
      oldPassword: payload.current_password,
      newPassword: payload.new_password,
      confirmNewPassword: payload.new_password,
      updatedBy: payload.actor_id,
    })
    const env = ensureSuccess<boolean>(res.data)
    return {
      success: env.data === true,
      message: String(env.message ?? 'Password has been changed successfully.'),
    }
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}
