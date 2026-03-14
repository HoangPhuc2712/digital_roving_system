import { users, roles } from '@/mocks/db'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import { appConfig } from '@/config/app'

function omitPassword(u: any) {
  const { user_password, ...safe } = u
  return safe
}

function isApiEnabled() {
  const baseURL = appConfig.apiBaseUrl || ''
  return !!baseURL
}

function mapRoleCode(roleName?: string, roleCode?: string) {
  const name = String(roleName ?? '')
    .trim()
    .toUpperCase()
  const code = String(roleCode ?? '')
    .trim()
    .toUpperCase()

  if (name === 'ADMINISTRATOR' || name === 'ADMIN') return 'ADMIN'
  if (name === 'IT') return 'IT'
  if (name === 'SECURITY') return 'SECURITY'
  if (name === 'EXPAT') return 'EXPAT'

  // Fallback theo code số nếu backend dùng 01/02...
  if (code === '01') return 'ADMIN'
  if (code === '02') return 'IT'

  return name || code
}

function toAuthUser(apiUser: any) {
  const now = new Date().toISOString()

  const user = {
    user_id: apiUser.userId,
    user_status: apiUser.userStatus == null || apiUser.userStatus === 0 ? 1 : 0,
    user_role_id: apiUser.userRoleId,
    user_name: apiUser.userName,
    user_code: apiUser.userCode,
    user_role_is_admin: Boolean(apiUser.userRoleIsAdmin),
    created_date: apiUser.createdAt ?? now,
    created_by: apiUser.createdBy ?? apiUser.userId,
    updated_date: apiUser.updatedAt ?? now,
    updated_by: apiUser.updatedBy ?? apiUser.userId,
  }

  const role_code = mapRoleCode(
    apiUser.userRoleName ?? apiUser.roleName,
    apiUser.userRoleCode ?? apiUser.roleCode,
  )
  const role_name = apiUser.userRoleName ?? apiUser.roleName ?? ''

  const role = {
    role_id: apiUser.userRoleId,
    role_status: 1,
    role_code,
    role_name,
    role_is_admin: Boolean(apiUser.userRoleIsAdmin),
    role_allow_view: '',
    created_at: apiUser.createdAt ?? now,
    created_by: apiUser.createdBy ?? apiUser.userId,
    updated_at: apiUser.updatedAt ?? now,
    updated_by: apiUser.updatedBy ?? apiUser.userId,
  }

  const allow_views = Array.isArray(apiUser?.allowViews) ? apiUser.allowViews : []
  return { ...omitPassword(user), role, allow_views }
}

export async function mockLogin(user_code: string, user_password: string) {
  if (isApiEnabled()) {
    const res = await http.post(endpoints.user.validate, {
      userCode: user_code,
      userPassword: user_password,
    })

    const payload = res?.data
    const ok = !!payload?.success
    const msg = String(payload?.message ?? '')

    if (!ok) {
      // Giữ đúng error-code để Login.vue đang map message không phải sửa
      if (msg.toLowerCase().includes('mật khẩu')) throw new Error('INVALID_PASSWORD')
      throw new Error('LOGIN_FAILED')
    }

    const apiUser = payload?.data
    if (!apiUser?.userId || apiUser.userId === '00000000-0000-0000-0000-000000000000') {
      throw new Error('USER_NOT_FOUND')
    }

    // /User/validate hiện không trả userStatus, nên chỉ check nếu backend có trả
    if (apiUser.userStatus != null && apiUser.userStatus !== 0) {
      throw new Error('USER_INACTIVE')
    }

    const token = `api-token-${apiUser.userId}`
    return { token, user: toAuthUser(apiUser) }
  }

  // Fallback mock cũ
  const user = users.find((u) => u.user_code === user_code && u.user_status >= 0)
  if (!user) throw new Error('USER_NOT_FOUND')

  if (user.user_status !== 1) throw new Error('USER_INACTIVE')

  if (!user.user_password || user.user_password !== user_password) {
    throw new Error('INVALID_PASSWORD')
  }

  const role = roles.find((r) => r.role_id === user.user_role_id && r.role_status >= 0)
  const token = `mock-token-${user.user_id}`
  return { token, user: { ...omitPassword(user), role } }
}

export async function mockMe(token: string) {
  if (isApiEnabled()) {
    const userId = token.startsWith('api-token-') ? token.replace('api-token-', '') : ''
    if (!userId) throw new Error('INVALID_TOKEN')

    // Lấy lại user từ UserView/getlist theo userId
    const res = await http.get(endpoints.userView.getOne(userId))
    const payload = res?.data

    if (!payload?.success) throw new Error('INVALID_TOKEN')

    const first = payload?.data
    if (!first?.userId) throw new Error('INVALID_TOKEN')

    if (first.userStatus != null && first.userStatus !== 0) throw new Error('USER_INACTIVE')

    return { user: toAuthUser(first) }
  }

  // Fallback mock cũ
  const uuid = token.replace('mock-token-', '')
  const user = users.find((u) => u.user_id === uuid && u.user_status >= 0)
  if (!user) throw new Error('INVALID_TOKEN')

  if (user.user_status !== 1) throw new Error('USER_INACTIVE')

  const role = roles.find((r) => r.role_id === user.user_role_id && r.role_status >= 0)
  return { user: { ...omitPassword(user), role } }
}
