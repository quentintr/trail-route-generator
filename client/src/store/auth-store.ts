import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthTokens, LoginRequest, RegisterRequest } from '../types/route'
import { apiService } from '../services/api'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshTokens: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  setUser: (user: User | null) => void
  setTokens: (tokens: AuthTokens | null) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await apiService.login(credentials.email, credentials.password)
          
          if (response.success) {
            set({
              user: response.user,
              tokens: response.tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } else {
            set({
              error: response.message || 'Login failed',
              isLoading: false,
            })
          }
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          })
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await apiService.register(userData.email, userData.password, userData.name)
          
          if (response.success) {
            set({
              user: response.user,
              tokens: response.tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } else {
            set({
              error: response.message || 'Registration failed',
              isLoading: false,
            })
          }
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          })
        }
      },

      logout: async () => {
        set({ isLoading: true })
        
        try {
          const { tokens } = get()
          if (tokens?.refreshToken) {
            await apiService.logout(tokens.refreshToken)
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      refreshTokens: async () => {
        const { tokens } = get()
        if (!tokens?.refreshToken) {
          set({ isAuthenticated: false })
          return
        }

        try {
          const newTokens = await apiService.refreshToken(tokens.refreshToken)
          set({ tokens: newTokens })
        } catch (error) {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
          })
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setUser: (user: User | null) => set({ user }),
      setTokens: (tokens: AuthTokens | null) => set({ tokens }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
