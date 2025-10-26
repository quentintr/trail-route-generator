import { useCallback, useEffect } from 'react'
import { useAuthStore } from '../store/auth-store'
import { LoginRequest, RegisterRequest } from '../types/route'

export const useAuth = () => {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshTokens,
    clearError,
  } = useAuthStore()

  // Auto-refresh tokens when they're about to expire
  useEffect(() => {
    if (!tokens?.accessToken) return

    const token = JSON.parse(atob(tokens.accessToken.split('.')[1]))
    const expirationTime = token.exp * 1000
    const currentTime = Date.now()
    const timeUntilExpiry = expirationTime - currentTime

    // Refresh token 5 minutes before expiry
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0)

    const timeoutId = setTimeout(() => {
      refreshTokens()
    }, refreshTime)

    return () => clearTimeout(timeoutId)
  }, [tokens, refreshTokens])

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    await login(credentials)
  }, [login])

  const handleRegister = useCallback(async (userData: RegisterRequest) => {
    await register(userData)
  }, [register])

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  const handleClearError = useCallback(() => {
    clearError()
  }, [clearError])

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError: handleClearError,
  }
}
