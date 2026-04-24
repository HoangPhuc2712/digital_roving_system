import Axios, { AxiosError } from 'axios'
import { appConfig } from '@/config/app'

const baseURL = appConfig.apiBaseUrl || ''
const AUTH_SESSION_STORAGE_KEY = 'auth_session'

type UnauthorizedHandler = (error: AxiosError) => void | Promise<void>

let unauthorizedHandler: UnauthorizedHandler | null = null

function readPersistedAuthToken() {
  try {
    const authSessionRaw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (authSessionRaw) {
      const parsed = JSON.parse(authSessionRaw) as {
        tokens?: { accessToken?: string; tokenType?: string }
      }
      const accessToken = String(parsed?.tokens?.accessToken ?? '').trim()
      const tokenType = String(parsed?.tokens?.tokenType ?? 'Bearer').trim() || 'Bearer'
      if (accessToken) return { accessToken, tokenType }
    }
  } catch {
    // ignore corrupted persisted auth session and fall back to legacy storage
  }

  const legacyToken = String(localStorage.getItem('token') ?? '').trim()
  if (!legacyToken) return null
  return { accessToken: legacyToken, tokenType: 'Bearer' }
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

export const http = Axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
})

http.interceptors.request.use((config) => {
  const authToken = readPersistedAuthToken()

  if (authToken?.accessToken) {
    config.headers = config.headers ?? {}
    if (!config.headers.Authorization && !(config.headers as any).authorization) {
      config.headers.Authorization = `${authToken.tokenType} ${authToken.accessToken}`
    }
  }

  return config
})

http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401 && unauthorizedHandler) {
      await unauthorizedHandler(err)
    }

    return Promise.reject(err)
  },
)
