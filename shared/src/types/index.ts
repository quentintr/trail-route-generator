// User types
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  name: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

// Trail types
export interface Trail {
  id: string
  name: string
  description?: string
  difficulty: Difficulty
  distance: number
  duration: number
  elevation: number
  startPoint: GeoPoint
  endPoint: GeoPoint
  createdAt: Date
  updatedAt: Date
  userId: string
  user: User
  averageRating?: number
  reviewCount?: number
}

export interface CreateTrailData {
  name: string
  description?: string
  difficulty: Difficulty
  distance: number
  duration: number
  elevation: number
  startLatitude: number
  startLongitude: number
  endLatitude: number
  endLongitude: number
}

// Route types
export interface Route {
  id: string
  name: string
  description?: string
  difficulty: Difficulty
  distance: number
  duration: number
  elevation: number
  createdAt: Date
  updatedAt: Date
  userId: string
  user: User
  waypoints: Waypoint[]
  averageRating?: number
  reviewCount?: number
}

export interface Waypoint {
  id: string
  name: string
  latitude: number
  longitude: number
  type: WaypointType
  description?: string
  routeId: string
}

export interface CreateRouteData {
  name: string
  description?: string
  difficulty: Difficulty
  distance: number
  duration: number
  elevation: number
  waypoints: Omit<Waypoint, 'id' | 'routeId'>[]
}

// Review types
export interface Review {
  id: string
  rating: number
  comment?: string
  createdAt: Date
  updatedAt: Date
  userId: string
  user: User
  trailId?: string
  routeId?: string
}

export interface CreateReviewData {
  rating: number
  comment?: string
  trailId?: string
  routeId?: string
}

// Enums
export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXPERT = 'EXPERT'
}

export enum WaypointType {
  START = 'START',
  END = 'END',
  WAYPOINT = 'WAYPOINT'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Geographic types
export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
}

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

// Search and filter types
export interface TrailFilters {
  difficulty?: Difficulty
  minDistance?: number
  maxDistance?: number
  minDuration?: number
  maxDuration?: number
  search?: string
  boundingBox?: BoundingBox
}

export interface RouteFilters {
  difficulty?: Difficulty
  minDistance?: number
  maxDistance?: number
  minDuration?: number
  maxDuration?: number
  search?: string
  userId?: string
}

// Map types
export interface MapMarker {
  id: string
  latitude: number
  longitude: number
  title: string
  description?: string
  type: 'trail' | 'route' | 'waypoint'
  data?: Trail | Route | Waypoint
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

// Statistics types
export interface UserStats {
  totalRoutes: number
  totalTrails: number
  totalDistance: number
  totalDuration: number
  averageRating: number
  favoriteDifficulty: Difficulty
}

export interface TrailStats {
  totalTrails: number
  averageDistance: number
  averageDuration: number
  averageElevation: number
  difficultyDistribution: Record<Difficulty, number>
}
