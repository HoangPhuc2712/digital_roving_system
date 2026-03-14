export type PermissionKey =
  | 'reports.view_all'
  | 'reports.view_mine'
  | 'reports.edit'
  | 'reports.delete'
  | 'roles.manage'
  | 'users.manage'
  | 'areas.manage'
  | 'checkpoints.manage'
  | 'routes.manage'
  | 'settings.manage'

const ALL_KEYS: PermissionKey[] = [
  'reports.view_all',
  'reports.view_mine',
  'reports.edit',
  'reports.delete',
  'roles.manage',
  'users.manage',
  'areas.manage',
  'checkpoints.manage',
  'routes.manage',
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

type AllowViewItem = {
  mcCode?: string
  mcName?: string
  mcActive?: boolean
}

function normalizeMenuName(input?: string) {
  return String(input ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

const MENU_NAME_TO_PERMS: Record<string, PermissionKey[]> = {
  ROLES: ['roles.manage'],
  USERS: ['users.manage'],
  AREAS: ['areas.manage'],
  ROUTES: ['routes.manage', 'checkpoints.manage'],
  // REPORTS giữ theo roleCode: view_all / view_mine
  // TUTORIAL chưa map permission riêng
}

export function derivePermissionsFromAllowViews(
  roleCode?: string,
  allowViews?: AllowViewItem[] | null,
  roleAllowView?: string,
): Set<PermissionKey> {
  const base = derivePermissions(roleCode, roleAllowView)

  const list = Array.isArray(allowViews) ? allowViews : []
  if (!list.length) return base

  const perms = new Set<PermissionKey>(base)
  for (const it of list) {
    const name = normalizeMenuName(it?.mcName)
    if (!name) continue
    if (it?.mcActive === false) continue

    const mapped = MENU_NAME_TO_PERMS[name]
    if (!mapped) continue
    for (const p of mapped) perms.add(p)
  }

  return perms
}

export function hasPermission(
  perms: Set<PermissionKey>,
  required?: PermissionKey | PermissionKey[],
) {
  if (!required) return true
  if (Array.isArray(required)) return required.some((k) => perms.has(k))
  return perms.has(required)
}
