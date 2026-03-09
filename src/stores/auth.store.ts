import { defineStore } from 'pinia'
import {
  derivePermissionsFromAllowViews,
  hasPermission,
  type PermissionKey,
} from '@/utils/permission'
import type { User, Role } from '@/mocks/db'
import { mockLogin, mockMe } from '@/services/auth.service'

type AuthUser = User & { role?: Role; allow_views?: any[] }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '' as string,
    user: null as AuthUser | null,
    permissions: new Set<PermissionKey>(),
    loading: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
  },
  actions: {
    canAccess(required?: PermissionKey | PermissionKey[]) {
      return hasPermission(this.permissions, required)
    },

    setSession(payload: { token: string; user: AuthUser }) {
      this.token = payload.token
      this.user = payload.user

      const roleCode = payload.user.role?.role_code
      const allow = payload.user.role?.role_allow_view
      this.permissions = derivePermissionsFromAllowViews(roleCode, payload.user.allow_views, allow)

      localStorage.setItem('token', payload.token)
      localStorage.setItem('user', JSON.stringify(payload.user))
      localStorage.setItem('role_allow_view', allow ?? '')
      localStorage.setItem('role_code', roleCode ?? '')
      localStorage.setItem('allow_views', JSON.stringify(payload.user.allow_views ?? []))
    },

    clearSession() {
      this.token = ''
      this.user = null
      this.permissions = new Set()

      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('role_allow_view')
      localStorage.removeItem('role_code')
      localStorage.removeItem('allow_views')
    },

    logout() {
      this.clearSession()
    },

    restoreSession() {
      const token = localStorage.getItem('token') ?? ''
      const userRaw = localStorage.getItem('user')

      if (!token || !userRaw) return

      const user = JSON.parse(userRaw) as AuthUser
      this.token = token
      this.user = user

      const allow = localStorage.getItem('role_allow_view') ?? user.role?.role_allow_view ?? ''

      const roleCode = localStorage.getItem('role_code') ?? user.role?.role_code ?? ''

      const allowViewsRaw = localStorage.getItem('allow_views')
      const allowViews = allowViewsRaw ? JSON.parse(allowViewsRaw) : user.allow_views

      this.permissions = derivePermissionsFromAllowViews(roleCode, allowViews, allow)
    },

    async login(user_code: string, user_password: string) {
      this.loading = true
      try {
        const res = await mockLogin(user_code, user_password)
        this.setSession(res)
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      if (!this.token) return
      const res = await mockMe(this.token)

      this.user = res.user as AuthUser

      const roleCode = res.user.role?.role_code ?? ''
      const allow = res.user.role?.role_allow_view ?? ''
      const allowViews = (res.user as any)?.allow_views
      this.permissions = derivePermissionsFromAllowViews(roleCode, allowViews, allow)

      localStorage.setItem('user', JSON.stringify(res.user))
      localStorage.setItem('role_allow_view', allow)
      localStorage.setItem('role_code', roleCode)
      localStorage.setItem('allow_views', JSON.stringify(allowViews ?? []))
    },
  },
})
