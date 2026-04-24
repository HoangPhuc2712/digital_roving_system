export type TranslateFn = (key: string) => string

function normalizeHardText(input?: string | null) {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Đđ]/g, 'D')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

export function translateMenuCategoryName(rawValue: string, t: TranslateFn) {
  switch (normalizeHardText(rawValue)) {
    case 'ROLES':
      return t('dataTranslation.menuCategory.roles')
    case 'USERS':
      return t('dataTranslation.menuCategory.users')
    case 'AREAS':
      return t('dataTranslation.menuCategory.areas')
    case 'ROUTES':
      return t('dataTranslation.menuCategory.routes')
    case 'REPORTS':
      return t('dataTranslation.menuCategory.reports')
    case 'TUTORIAL':
      return t('dataTranslation.menuCategory.tutorial')
    case 'CHECKPOINTS':
    case 'CHECK POINTS':
      return t('dataTranslation.menuCategory.checkpoints')
    default:
      return String(rawValue ?? '')
  }
}

export function translateRoleName(rawValue: string, t: TranslateFn) {
  switch (normalizeHardText(rawValue)) {
    case 'ADMINISTRATOR':
      return t('dataTranslation.role.administrator')
    case 'BAO VE':
      return t('dataTranslation.role.guard')
    case 'EXPAT':
      return t('dataTranslation.role.expat')
    case 'IT':
      return t('dataTranslation.role.it')
    default:
      return String(rawValue ?? '')
  }
}

export function translateRoleNames(rawValues: string[] | null | undefined, t: TranslateFn) {
  return (Array.isArray(rawValues) ? rawValues : []).map((value) => translateRoleName(value, t))
}

export function translateReportNote(rawValue: string, t: TranslateFn) {
  switch (normalizeHardText(rawValue)) {
    case 'KHONG CO VAN DE PHAT SINH':
      return t('dataTranslation.reportNote.noIssue')
    case 'CO VAN DE PHAT SINH':
      return t('dataTranslation.reportNote.hasIssue')
    default:
      return String(rawValue ?? '')
  }
}

export function translateIssueStatusName(rawValue: string, t: TranslateFn) {
  switch (normalizeHardText(rawValue)) {
    case 'PENDING':
    case 'DANG CHO XU LY':
      return t('reportList.issueStatusOptions.pending')
    case 'IN PROGRESS':
    case 'DANG XU LY':
      return t('reportList.issueStatusOptions.inProgress')
    case 'COMPLETED':
    case 'HOAN THANH':
      return t('reportList.issueStatusOptions.completed')
    case 'INCOMPLETED':
    case 'CHUA HOAN THANH':
      return t('reportList.issueStatusOptions.incompleted')
    default:
      return String(rawValue ?? '')
  }
}

export function translateRouteName(rawValue: string, t: TranslateFn) {
  const original = String(rawValue ?? '')
  const trimmed = original.trim()
  if (!trimmed) return original

  const patterns = [
    /^(.*?)(\s+)Lộ trình tuần tra số(\s+)(\d+)\s*$/iu,
    /^(.*?)(\s+)Lo trinh tuan tra so(\s+)(\d+)\s*$/iu,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (!match) continue
    const prefix = String(match[1] ?? '').trimEnd()
    const number = String(match[4] ?? '').trim()
    const translatedPhrase = t('dataTranslation.route.routeNumber')
    return prefix ? `${prefix} ${translatedPhrase} ${number}` : `${translatedPhrase} ${number}`
  }

  return original
}
