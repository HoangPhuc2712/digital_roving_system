import { users, roles } from '@/mocks/db'

function omitPassword(u: any) {
  const { user_password, ...safe } = u
  return safe
}

export async function mockLogin(user_code: string, user_password: string) {
  const user = users.find((u) => u.user_code === user_code && u.user_status >= 0)
  if (!user) throw new Error('USER_NOT_FOUND')

  if (!user.user_password || user.user_password !== user_password) {
    throw new Error('INVALID_PASSWORD')
  }

  const role = roles.find((r) => r.role_id === user.user_role_id && r.role_status >= 0)

  const token = `mock-token-${user.user_id}`
  return { token, user: { ...omitPassword(user), role } }
}

export async function mockMe(token: string) {
  const uuid = token.replace('mock-token-', '')
  const user = users.find((u) => u.user_id === uuid && u.user_status >= 0)
  if (!user) throw new Error('INVALID_TOKEN')

  const role = roles.find((r) => r.role_id === user.user_role_id && r.role_status >= 0)
  return { user: { ...omitPassword(user), role } }
}
