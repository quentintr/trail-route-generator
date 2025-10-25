import { create } from 'zustand'

export interface Waypoint {
  id: string
  name: string
  latitude: number
  longitude: number
  type: 'start' | 'end' | 'waypoint'
  description?: string
}

export interface Route {
  id: string
  name: string
  description: string
  distance: number
  duration: number
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  elevation: number
  waypoints: Waypoint[]
  createdAt: Date
  updatedAt: Date
}

interface RouteState {
  routes: Route[]
  currentRoute: Route | null
  isLoading: boolean
  error: string | null
  
  // Actions
  createRoute: (routeData: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Route>
  updateRoute: (id: string, updates: Partial<Route>) => Promise<void>
  deleteRoute: (id: string) => Promise<void>
  fetchRoutes: () => Promise<void>
  setCurrentRoute: (route: Route | null) => void
  clearError: () => void
}

export const useRouteStore = create<RouteState>((set, get) => ({
  routes: [],
  currentRoute: null,
  isLoading: false,
  error: null,

  createRoute: async (routeData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulation d'un appel API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newRoute: Route = {
        ...routeData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      set(state => ({
        routes: [...state.routes, newRoute],
        currentRoute: newRoute,
        isLoading: false
      }))
      
      return newRoute
    } catch (error) {
      set({ 
        error: 'Erreur lors de la création de l\'itinéraire',
        isLoading: false 
      })
      throw error
    }
  },

  updateRoute: async (id: string, updates: Partial<Route>) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulation d'un appel API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        routes: state.routes.map(route => 
          route.id === id 
            ? { ...route, ...updates, updatedAt: new Date() }
            : route
        ),
        currentRoute: state.currentRoute?.id === id 
          ? { ...state.currentRoute, ...updates, updatedAt: new Date() }
          : state.currentRoute,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Erreur lors de la mise à jour de l\'itinéraire',
        isLoading: false 
      })
      throw error
    }
  },

  deleteRoute: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulation d'un appel API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        routes: state.routes.filter(route => route.id !== id),
        currentRoute: state.currentRoute?.id === id ? null : state.currentRoute,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Erreur lors de la suppression de l\'itinéraire',
        isLoading: false 
      })
      throw error
    }
  },

  fetchRoutes: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulation d'un appel API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Données d'exemple
      const mockRoutes: Route[] = [
        {
          id: '1',
          name: 'Sentier des Crêtes',
          description: 'Magnifique sentier avec vue panoramique',
          distance: 12.5,
          duration: 270, // 4h30 en minutes
          difficulty: 'medium',
          elevation: 850,
          waypoints: [
            {
              id: '1',
              name: 'Départ',
              latitude: 45.1885,
              longitude: 5.7245,
              type: 'start'
            },
            {
              id: '2',
              name: 'Arrivée',
              latitude: 45.1950,
              longitude: 5.7300,
              type: 'end'
            }
          ],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15')
        }
      ]
      
      set({ 
        routes: mockRoutes,
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Erreur lors du chargement des itinéraires',
        isLoading: false 
      })
    }
  },

  setCurrentRoute: (route: Route | null) => {
    set({ currentRoute: route })
  },

  clearError: () => {
    set({ error: null })
  }
}))
