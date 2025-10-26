import { create } from 'zustand'
import { Route, RouteGenerationRequest, RouteGenerationResponse } from '../types/route'
import { apiService } from '../services/api'

interface RoutesState {
  routes: Route[]
  currentRoute: Route | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filters: {
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
    terrain_type?: 'paved' | 'unpaved' | 'mixed'
    minDistance?: number
    maxDistance?: number
  }
}

interface RoutesActions {
  generateRoutes: (request: RouteGenerationRequest) => Promise<void>
  getRoute: (id: string) => Promise<void>
  getUserRoutes: () => Promise<void>
  saveRoute: (routeId: string) => Promise<void>
  setCurrentRoute: (route: Route | null) => void
  setSearchQuery: (query: string) => void
  setFilters: (filters: Partial<RoutesState['filters']>) => void
  clearRoutes: () => void
  clearError: () => void
  setLoading: (loading: boolean) => void
}

type RoutesStore = RoutesState & RoutesActions

export const useRoutesStore = create<RoutesStore>((set, get) => ({
  // State
  routes: [],
  currentRoute: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filters: {},

  // Actions
  generateRoutes: async (request: RouteGenerationRequest) => {
    set({ isLoading: true, error: null })
    
    try {
      const response: RouteGenerationResponse = await apiService.generateRoute(request)
      
      if (response.success) {
        set({
          routes: response.routes,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          error: response.message || 'Failed to generate routes',
          isLoading: false,
        })
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to generate routes',
        isLoading: false,
      })
    }
  },

  getRoute: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiService.getRoute(id)
      
      if (response.success) {
        set({
          currentRoute: response.route,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          error: response.message || 'Failed to get route',
          isLoading: false,
        })
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to get route',
        isLoading: false,
      })
    }
  },

  getUserRoutes: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiService.getUserRoutes()
      
      if (response.success) {
        set({
          routes: response.routes,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          error: response.message || 'Failed to get user routes',
          isLoading: false,
        })
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to get user routes',
        isLoading: false,
      })
    }
  },

  saveRoute: async (routeId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiService.saveRoute(routeId)
      
      if (response.success) {
        // Update the route in the current list
        const { routes } = get()
        const updatedRoutes = routes.map(route =>
          route.id === routeId ? { ...route, user_id: response.user_id } : route
        )
        
        set({
          routes: updatedRoutes,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          error: response.message || 'Failed to save route',
          isLoading: false,
        })
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to save route',
        isLoading: false,
      })
    }
  },

  setCurrentRoute: (route: Route | null) => set({ currentRoute: route }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setFilters: (filters: Partial<RoutesState['filters']>) => 
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearRoutes: () => set({ routes: [], currentRoute: null }),
  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}))
