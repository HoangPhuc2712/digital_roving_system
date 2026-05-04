import { users, roles } from '@/mocks/db'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import { appConfig } from '@/config/app'
import type { AuthTokens, ParsedLoginResult } from '@/types/auth'

function omitPassword(u: any) {
  const { user_password, ...safe } = u
  return safe
}

const ACCESS_TOKEN_LIFETIME_SECONDS = 60 * 60

function isApiEnabled() {
  const baseURL = appConfig.apiBaseUrl || ''
  return !!baseURL
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const [, payload] = String(token ?? '').split('.')
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const decoded = atob(padded)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function resolveJwtExpiresAt(accessToken: string): string | null {
  const payload = decodeJwtPayload(accessToken)
  const exp = Number(payload?.exp ?? 0)
  if (!Number.isFinite(exp) || exp <= 0) return null
  return new Date(exp * 1000).toISOString()
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

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function resolveExpiresAt(
  accessToken: string,
  expiresIn: number | null,
  rawExpiresAt: unknown,
): string | null {
  if (typeof rawExpiresAt === 'string' && rawExpiresAt.trim()) return rawExpiresAt

  const jwtExpiresAt = resolveJwtExpiresAt(accessToken)
  if (jwtExpiresAt) return jwtExpiresAt

  const seconds = expiresIn || ACCESS_TOKEN_LIFETIME_SECONDS
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function extractTokenPayload(source: any): any {
  if (!source || typeof source !== 'object') return {}

  return source.tokens ?? source.tokenData ?? source.auth ?? source.authentication ?? source
}

function buildAuthTokens(payload: any, fallbackAccessToken = ''): AuthTokens {
  const tokenPayload = extractTokenPayload(payload)

  const accessToken = String(
    tokenPayload.accessToken ??
      tokenPayload.access_token ??
      tokenPayload.bearerToken ??
      tokenPayload.jwt ??
      tokenPayload.token ??
      fallbackAccessToken ??
      '',
  ).trim()

  const refreshToken = String(
    tokenPayload.refreshToken ?? tokenPayload.refresh_token ?? tokenPayload.refresh ?? '',
  ).trim()

  const tokenType = String(
    tokenPayload.tokenType ?? tokenPayload.token_type ?? tokenPayload.scheme ?? 'Bearer',
  ).trim()

  const expiresIn =
    toPositiveNumber(
      tokenPayload.expiresIn ?? tokenPayload.expires_in ?? tokenPayload.ttlSeconds,
    ) ?? ACCESS_TOKEN_LIFETIME_SECONDS
  const expiresAt = resolveExpiresAt(
    accessToken,
    expiresIn,
    tokenPayload.expiresAt ?? tokenPayload.expires_at ?? tokenPayload.expiredAt,
  )

  return {
    accessToken,
    refreshToken: refreshToken || undefined,
    tokenType: tokenType || 'Bearer',
    expiresIn,
    expiresAt,
  }
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
    area_name: apiUser.userAreaName ?? apiUser.areaName ?? '',
    area_code: apiUser.userAreaCode ?? apiUser.areaCode ?? '',
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

export async function mockLogin(
  user_code: string,
  user_password: string,
): Promise<ParsedLoginResult<any>> {
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

    const tokens = buildAuthTokens(apiUser)
    if (!tokens.accessToken) {
      throw new Error('LOGIN_FAILED')
    }

    return { tokens, user: toAuthUser(apiUser), raw: payload }
  }

  // Fallback mock cũ
  const user = users.find((u) => u.user_code === user_code && u.user_status >= 0)
  if (!user) throw new Error('USER_NOT_FOUND')

  if (user.user_status !== 1) throw new Error('USER_INACTIVE')

  if (!user.user_password || user.user_password !== user_password) {
    throw new Error('INVALID_PASSWORD')
  }

  const role = roles.find((r) => r.role_id === user.user_role_id && r.role_status >= 0)
  const tokens = buildAuthTokens({}, `mock-token-${user.user_id}`)
  return { tokens, user: { ...omitPassword(user), role } }
}

export async function logoutUser(
  userId: string,
  accessToken?: string,
  tokenType = 'Bearer',
): Promise<void> {
  const id = String(userId ?? '').trim()
  if (!id || !isApiEnabled()) return

  const token = String(accessToken ?? '').trim()
  const headers = token ? { Authorization: `${tokenType || 'Bearer'} ${token}` } : undefined

  try {
    const res = await http.post(
      endpoints.user.logout,
      {
        userId: id,
      },
      headers ? { headers } : undefined,
    )
    const payload = res?.data
    if (payload && payload.success === false) {
      throw new Error(String(payload.message ?? 'LOGOUT_FAILED'))
    }
  } catch {
    // Logout must still clear the local session even if the server call fails.
  }
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
