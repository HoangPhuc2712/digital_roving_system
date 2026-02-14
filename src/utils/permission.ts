export type PermissionKey =
  | 'reports.view_all'
  | 'reports.view_mine'
  | 'reports.edit'
  | 'reports.delete'
  | 'users.manage'
  | 'areas.manage'
  | 'checkpoints.manage'
  | 'settings.manage'

const ALL_KEYS: PermissionKey[] = [
  'reports.view_all',
  'reports.view_mine',
  'reports.edit',
  'reports.delete',
  'users.manage',
  'areas.manage',
  'checkpoints.manage',
  'settings.manage',
]

const MACRO_MAP: Record<string, PermissionKey[]> = {
  ALL: ALL_KEYS,
  IT_ONLY: ALL_KEYS,
  ASSIGNED_AREA: ['reports.view_mine'],
}

const KEY_SET = new Set<PermissionKey>(ALL_KEYS)

export function parseRoleAllowView(input?: string): Set<PermissionKey> {
  if (!input) return new Set()

  const raw = input.trim()
  if (MACRO_MAP[raw]) return new Set(MACRO_MAP[raw])

  const keys = raw
    .split(',')
    .map((s) => s.trim())
    .filter((k): k is PermissionKey => KEY_SET.has(k as PermissionKey))

  return new Set(keys)
}

export function derivePermissions(roleCode?: string, roleAllowView?: string): Set<PermissionKey> {
  const fromAllow = parseRoleAllowView(roleAllowView)
  if (fromAllow.size > 0) return fromAllow

  const code = String(roleCode ?? '').toUpperCase()

  if (code === 'ADMIN' || code === 'IT') return new Set(MACRO_MAP.ALL)
  if (code === 'SECURITY' || code === 'EXPAT') return new Set(MACRO_MAP.ASSIGNED_AREA)
  return new Set()
}

export function hasPermission(
  perms: Set<PermissionKey>,
  required?: PermissionKey | PermissionKey[],
) {
  if (!required) return true
  if (Array.isArray(required)) return required.some((k) => perms.has(k))
  return perms.has(required)
}
