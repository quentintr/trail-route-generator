export interface Route {
  id: string
  name: string
  description?: string
  distance: number // Distance in kilometers
  duration: number // Duration in minutes
  elevation: number // Total elevation gain in meters
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  terrain_type: 'paved' | 'unpaved' | 'mixed'
  created_at: string
  updated_at: string
  geometry?: GeoJSON.LineString
  waypoints?: Waypoint[]
  user_id?: string
}

export interface Waypoint {
  id: string
  route_id: string
  name?: string
  latitude: number
  longitude: number
  order: number
  created_at: string
}

export interface RouteSegment {
  id: string
  from: string
  to: string
  distance: number
  surface: 'paved' | 'unpaved'
  highway_type: string
  weight: number
}

export interface RouteGenerationRequest {
  start_lat: number
  start_lon: number
  distance?: number
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
  terrain_type?: 'paved' | 'unpaved' | 'mixed'
  elevation_gain?: number
}

export interface RouteGenerationResponse {
  success: boolean
  routes: Route[]
  message?: string
}

export interface User {
  id: string
  email: string
  name: string
  created_at: string
  updated_at: string
  preferences?: UserPreferences
}

export interface UserPreferences {
  difficulty_level?: 'easy' | 'medium' | 'hard' | 'expert'
  preferred_terrain?: 'paved' | 'unpaved' | 'mixed'
  max_distance?: number
  max_duration?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  success: boolean
  user: User
  tokens: AuthTokens
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface ApiError {
  message: string
  status?: number
  errors?: Array<{
    path: string
    message: string
  }>
}
