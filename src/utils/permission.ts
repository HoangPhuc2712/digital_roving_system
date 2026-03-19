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
  ASSIGNED_AREA: ['reports.view_mine'],
}

const KEY_SET = new Set<PermissionKey>(ALL_KEYS)
const NON_MENU_PERMISSION_SET = new Set<PermissionKey>([
  'reports.view_all',
  'reports.view_mine',
  'reports.edit',
  'reports.delete',
  'settings.manage',
])

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

export function derivePermissions(roleAllowView?: string): Set<PermissionKey> {
  const parsed = parseRoleAllowView(roleAllowView)
  if (!parsed.size) return new Set()

  return new Set(Array.from(parsed).filter((key) => NON_MENU_PERMISSION_SET.has(key)))
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
  AREAS: ['areas.manage', 'checkpoints.manage'],
  ROUTES: ['routes.manage'],
  REPORTS: ['reports.view_mine'],
  TUTORIAL: [],
}

export function derivePermissionsFromAllowViews(
  allowViews?: AllowViewItem[] | null,
  roleAllowView?: string,
): Set<PermissionKey> {
  const perms = derivePermissions(roleAllowView)

  const list = Array.isArray(allowViews) ? allowViews : []
  if (!list.length) return perms

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
