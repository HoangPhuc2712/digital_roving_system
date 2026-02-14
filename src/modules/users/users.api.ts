import { users, roles } from '@/mocks/db'
import type { UserRow } from './users.types'

function nowIso() {
  return new Date().toISOString()
}

function normalizeSearch(u: {
  user_name: string
  user_code: string
  role_name: string
  role_code: string
}) {
  return `${u.user_name} ${u.user_code} ${u.role_name} ${u.role_code}`.toLowerCase()
}

export async function fetchUserRows(): Promise<UserRow[]> {
  const roleMap = new Map<number, (typeof roles)[number]>()
  for (const r of roles) roleMap.set(r.role_id, r)

  const rows: UserRow[] = users
    .filter((u) => u.user_status >= 0)
    .map((u) => {
      const role = roleMap.get(u.user_role_id)
      const roleName = role?.role_name ?? ''
      const roleCode = role?.role_code ?? ''

      return {
        user_id: u.user_id,
        user_name: u.user_name,
        user_code: u.user_code,
        user_role_id: u.user_role_id,
        role_name: roleName,
        role_code: roleCode,
        user_status: u.user_status,
        created_date: u.created_date,
        updated_date: u.updated_date,
        _q: normalizeSearch({
          user_name: u.user_name,
          user_code: u.user_code,
          role_name: roleName,
          role_code: roleCode,
        }),
      }
    })
    .sort((a, b) => a.user_name.localeCompare(b.user_name))

  return rows
}

export async function fetchUserById(user_id: string) {
  const u = users.find((x) => x.user_id === user_id && x.user_status >= 0)
  if (!u) return null

  const role = roles.find((r) => r.role_id === u.user_role_id)
  return {
    user_id: u.user_id,
    user_name: u.user_name,
    user_code: u.user_code,
    user_role_id: u.user_role_id,
    role_name: role?.role_name ?? '',
    role_code: role?.role_code ?? '',
    user_status: u.user_status,
    created_date: u.created_date,
    updated_date: u.updated_date,
  }
}

export async function createUserMock(payload: {
  user_name: string
  user_code: string
  user_password: string
  user_role_id: number
  actor_id: string
}) {
  const code = payload.user_code.trim()

  const existed = users.some(
    (u) => u.user_code.toLowerCase() === code.toLowerCase() && u.user_status >= 0,
  )
  if (existed) throw new Error('USER_CODE_EXISTS')

  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto as any).randomUUID()
      : `mock-${Date.now()}-${Math.random()}`

  const t = nowIso()

  users.push({
    user_id: uuid,
    user_status: 1,
    user_role_id: payload.user_role_id,
    user_name: payload.user_name.trim(),
    user_code: code,
    user_password: payload.user_password,
    created_date: t,
    created_by: payload.actor_id,
    updated_date: t,
    updated_by: payload.actor_id,
  })

  return true
}

export async function updateUserMock(payload: {
  user_id: string
  user_name: string
  user_code: string
  user_password?: string
  user_role_id: number
  user_status: number
  actor_id: string
}) {
  const u = users.find((x) => x.user_id === payload.user_id)
  if (!u) throw new Error('USER_NOT_FOUND')

  const code = payload.user_code.trim()

  const existed = users.some(
    (x) =>
      x.user_id !== payload.user_id &&
      x.user_status >= 0 &&
      x.user_code.toLowerCase() === code.toLowerCase(),
  )
  if (existed) throw new Error('USER_CODE_EXISTS')

  u.user_name = payload.user_name.trim()
  u.user_code = code
  if (payload.user_password && payload.user_password.trim()) {
    u.user_password = payload.user_password
  }
  u.user_role_id = payload.user_role_id
  u.user_status = payload.user_status

  u.updated_date = nowIso()
  u.updated_by = payload.actor_id

  return true
}

export async function deleteUserMock(payload: { user_id: string; actor_id: string }) {
  const u = users.find((x) => x.user_id === payload.user_id)
  if (!u) throw new Error('USER_NOT_FOUND')

  u.user_status = -1
  u.updated_date = nowIso()
  u.updated_by = payload.actor_id

  return true
}

export async function fetchRoleOptions() {
  return roles
    .filter((r) => r.role_status >= 0)
    .sort((a, b) => a.role_name.localeCompare(b.role_name))
    .map((r) => ({ label: r.role_name, value: r.role_id }))
}
