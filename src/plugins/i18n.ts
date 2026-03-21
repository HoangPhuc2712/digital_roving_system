import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'
import vi from '@/i18n/locales/vi'
import zhTW from '@/i18n/locales/zh-TW'

export const SUPPORTED_LOCALES = ['en', 'vi', 'zh-TW'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_STORAGE_KEY = 'app:locale'
const DEFAULT_LOCALE: AppLocale = 'en'

function normalizeLocale(input?: string | null): AppLocale {
  if (!input) return DEFAULT_LOCALE
  if ((SUPPORTED_LOCALES as readonly string[]).includes(input)) {
    return input as AppLocale
  }
  return DEFAULT_LOCALE
}

function getInitialLocale(): AppLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return normalizeLocale(stored)
}

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    en,
    vi,
    'zh-TW': zhTW,
  },
})

export function setAppLocale(locale: string) {
  const normalized = normalizeLocale(locale)
  i18n.global.locale.value = normalized

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
    document.documentElement.lang = normalized
  }
}

export function initializeAppLocale() {
  setAppLocale(getInitialLocale())
}
