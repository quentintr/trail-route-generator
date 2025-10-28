import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, _password: string) => {
        set({ isLoading: true })
        
        try {
          // Simulation d'un appel API
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // En production, remplacer par un vrai appel API
          const user: User = {
            id: '1',
            name: 'Utilisateur Test',
            email: email,
            avatar: undefined
          }
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (name: string, email: string, _password: string) => {
        set({ isLoading: true })
        
        try {
          // Simulation d'un appel API
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // En production, remplacer par un vrai appel API
          const user: User = {
            id: '1',
            name: name,
            email: email,
            avatar: undefined
          }
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false 
        })
      },

      updateProfile: async (data: Partial<User>) => {
        const { user } = get()
        if (!user) return
        
        set({ isLoading: true })
        
        try {
          // Simulation d'un appel API
          await new Promise(resolve => setTimeout(resolve, 500))
          
          set({ 
            user: { ...user, ...data },
            isLoading: false 
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
)
