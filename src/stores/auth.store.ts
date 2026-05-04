import { defineStore } from 'pinia'
import {
  derivePermissionsFromAllowViews,
  hasPermission,
  type PermissionKey,
} from '@/utils/permission'
import type { User, Role } from '@/mocks/db'
import { mockLogin, mockMe, logoutUser } from '@/services/auth.service'
import type { AuthTokens, PersistedAuthSession } from '@/types/auth'

type AuthUser = User & { role?: Role; allow_views?: any[] }

type SessionExpiredHandler = (message: string) => void | Promise<void>

const AUTH_SESSION_STORAGE_KEY = 'auth_session'
const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000
const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'

let sessionExpiryTimer: ReturnType<typeof setTimeout> | null = null
let sessionExpiredHandler: SessionExpiredHandler | null = null

export function registerSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler
}

function clearSessionExpiryTimer() {
  if (sessionExpiryTimer) {
    clearTimeout(sessionExpiryTimer)
    sessionExpiryTimer = null
  }
}

function isLegacyUserIdToken(token: string) {
  return token.startsWith('api-token-') || token.startsWith('mock-token-')
}

function getExpiryTime(expiresAt?: string | null) {
  const value = String(expiresAt ?? '').trim()
  if (!value) return 0

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function isExpired(expiresAt?: string | null) {
  const expiryTime = getExpiryTime(expiresAt)
  return expiryTime > 0 && expiryTime <= Date.now()
}

function resolveTokenExpiresAt(expiresAt?: string | null) {
  const expiryTime = getExpiryTime(expiresAt)
  if (expiryTime > 0) return new Date(expiryTime).toISOString()
  return new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS).toISOString()
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '' as string,
    refreshToken: '' as string,
    tokenType: 'Bearer' as string,
    tokenExpiresAt: '' as string,
    user: null as AuthUser | null,
    permissions: new Set<PermissionKey>(),
    loading: false,
    sessionSyncedOnce: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    isAdminUser: (s) => Boolean((s.user as any)?.user_role_is_admin),
  },
  actions: {
    canAccess(required?: PermissionKey | PermissionKey[]) {
      return hasPermission(this.permissions, required)
    },

    isTokenExpired() {
      return isExpired(this.tokenExpiresAt)
    },

    scheduleSessionExpiry() {
      clearSessionExpiryTimer()

      if (!this.token || !this.user) return

      const expiryTime = getExpiryTime(this.tokenExpiresAt)
      if (!expiryTime) return

      const delay = expiryTime - Date.now()
      if (delay <= 0) {
        void this.expireSession()
        return
      }

      sessionExpiryTimer = setTimeout(() => {
        void this.expireSession()
      }, delay)
    },

    persistSession() {
      if (!this.token || !this.user) return

      const session: PersistedAuthSession<AuthUser> = {
        tokens: {
          accessToken: this.token,
          refreshToken: this.refreshToken || undefined,
          tokenType: this.tokenType || 'Bearer',
          expiresAt: this.tokenExpiresAt || undefined,
        },
        user: this.user,
        savedAt: new Date().toISOString(),
      }

      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
      localStorage.setItem('token', this.token)
      localStorage.setItem('user', JSON.stringify(this.user))

      const allow = this.user.role?.role_allow_view ?? ''
      localStorage.setItem('role_allow_view', allow)
      localStorage.setItem('allow_views', JSON.stringify(this.user.allow_views ?? []))
    },

    setSession(payload: { user: AuthUser; tokens?: AuthTokens; token?: string }) {
      const accessToken = payload.tokens?.accessToken ?? payload.token ?? ''
      this.token = accessToken
      this.refreshToken = payload.tokens?.refreshToken ?? ''
      this.tokenType = payload.tokens?.tokenType ?? 'Bearer'
      this.tokenExpiresAt = resolveTokenExpiresAt(payload.tokens?.expiresAt)
      this.user = payload.user

      const allow = payload.user.role?.role_allow_view
      this.permissions = derivePermissionsFromAllowViews(payload.user.allow_views, allow)

      this.persistSession()
      this.scheduleSessionExpiry()
      this.sessionSyncedOnce = true
    },

    updateTokens(tokens: AuthTokens) {
      const accessToken = String(tokens.accessToken ?? '').trim()
      if (!accessToken) return

      this.token = accessToken
      this.refreshToken = tokens.refreshToken ?? this.refreshToken
      this.tokenType = tokens.tokenType ?? this.tokenType ?? 'Bearer'
      this.tokenExpiresAt = resolveTokenExpiresAt(tokens.expiresAt)

      this.persistSession()
      this.scheduleSessionExpiry()
    },

    clearSession() {
      clearSessionExpiryTimer()

      this.token = ''
      this.refreshToken = ''
      this.tokenType = 'Bearer'
      this.tokenExpiresAt = ''
      this.user = null
      this.permissions = new Set()

      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('role_allow_view')
      localStorage.removeItem('allow_views')
      this.sessionSyncedOnce = false
    },

    async expireSession() {
      if (!this.token && !this.user) return

      this.clearSession()
      await sessionExpiredHandler?.(SESSION_EXPIRED_MESSAGE)
    },

    logout() {
      const userId = String((this.user as any)?.user_id ?? '').trim()
      const accessToken = this.token
      const tokenType = this.tokenType || 'Bearer'

      this.clearSession()

      if (userId) {
        void logoutUser(userId, accessToken, tokenType)
      }
    },

    restoreSession() {
      const persistedSessionRaw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
      if (persistedSessionRaw) {
        const persisted = JSON.parse(persistedSessionRaw) as PersistedAuthSession<AuthUser>
        const accessToken = persisted?.tokens?.accessToken ?? ''
        const user = persisted?.user ?? null

        if (accessToken && user) {
          if (isExpired(persisted.tokens?.expiresAt)) {
            this.clearSession()
            void sessionExpiredHandler?.(SESSION_EXPIRED_MESSAGE)
            return
          }

          this.token = accessToken
          this.refreshToken = persisted.tokens?.refreshToken ?? ''
          this.tokenType = persisted.tokens?.tokenType ?? 'Bearer'
          this.tokenExpiresAt = resolveTokenExpiresAt(persisted.tokens?.expiresAt)
          this.user = user

          const allow = localStorage.getItem('role_allow_view') ?? user.role?.role_allow_view ?? ''
          const allowViewsRaw = localStorage.getItem('allow_views')
          const allowViews = allowViewsRaw ? JSON.parse(allowViewsRaw) : user.allow_views

          this.permissions = derivePermissionsFromAllowViews(allowViews, allow)
          this.sessionSyncedOnce = false
          this.scheduleSessionExpiry()
          return
        }
      }

      const token = localStorage.getItem('token') ?? ''
      const userRaw = localStorage.getItem('user')

      if (!token || !userRaw) return

      const user = JSON.parse(userRaw) as AuthUser
      this.token = token
      this.refreshToken = ''
      this.tokenType = 'Bearer'
      this.tokenExpiresAt = resolveTokenExpiresAt()
      this.user = user

      const allow = localStorage.getItem('role_allow_view') ?? user.role?.role_allow_view ?? ''
      const allowViewsRaw = localStorage.getItem('allow_views')
      const allowViews = allowViewsRaw ? JSON.parse(allowViewsRaw) : user.allow_views

      this.permissions = derivePermissionsFromAllowViews(allowViews, allow)
      this.sessionSyncedOnce = false
      this.persistSession()
      this.scheduleSessionExpiry()
    },

    async login(user_code: string, user_password: string) {
      this.loading = true
      try {
        const res = await mockLogin(user_code, user_password)
        this.setSession({ user: res.user as AuthUser, tokens: res.tokens })
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      if (!this.token) return

      if (this.isTokenExpired()) {
        await this.expireSession()
        return
      }

      if (this.user && !isLegacyUserIdToken(this.token)) {
        this.sessionSyncedOnce = true
        return
      }
      const res = await mockMe(this.token)

      this.user = res.user as AuthUser

      const allow = res.user.role?.role_allow_view ?? ''
      const allowViews = (res.user as any)?.allow_views
      this.permissions = derivePermissionsFromAllowViews(allowViews, allow)

      this.persistSession()
      this.scheduleSessionExpiry()
      this.sessionSyncedOnce = true
    },

    async syncSessionWithServer() {
      if (!this.token) return false

      if (this.isTokenExpired()) {
        await this.expireSession()
        return false
      }

      try {
        await this.fetchMe()
        return true
      } catch {
        this.clearSession()
        return false
      }
    },
  },
})
