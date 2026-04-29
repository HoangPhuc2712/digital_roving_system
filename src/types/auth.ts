export type AuthTokenType = string

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
  tokenType?: AuthTokenType
  expiresIn?: number | null
  expiresAt?: string | null
}

export interface AuthSession<TUser = unknown> {
  tokens: AuthTokens
  user: TUser
}

export interface PersistedAuthSession<TUser = unknown> extends AuthSession<TUser> {
  savedAt: string
}

export interface ParsedLoginResult<TUser = unknown> extends AuthSession<TUser> {
  raw?: unknown
}
