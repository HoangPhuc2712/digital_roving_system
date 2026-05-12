import { i18n } from '@/plugins/i18n'

export function excelT(key: string, fallback: string) {
  const value = i18n.global.t(key)
  return value && value !== key ? String(value) : fallback
}

export function excelText(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim()
  return text || fallback
}
