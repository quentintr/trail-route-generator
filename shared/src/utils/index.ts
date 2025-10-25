import { Difficulty, WaypointType } from '../types'

// Distance calculation utilities
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

// Duration formatting
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}min`
  }
  
  if (mins === 0) {
    return `${hours}h`
  }
  
  return `${hours}h${mins.toString().padStart(2, '0')}`
}

// Distance formatting
export const formatDistance = (kilometers: number): string => {
  if (kilometers < 1) {
    return `${Math.round(kilometers * 1000)}m`
  }
  
  return `${kilometers.toFixed(1)}km`
}

// Elevation formatting
export const formatElevation = (meters: number): string => {
  return `${Math.round(meters)}m`
}

// Difficulty utilities
export const getDifficultyLabel = (difficulty: Difficulty): string => {
  const labels = {
    [Difficulty.EASY]: 'Facile',
    [Difficulty.MEDIUM]: 'Moyen',
    [Difficulty.HARD]: 'Difficile',
    [Difficulty.EXPERT]: 'Expert'
  }
  
  return labels[difficulty]
}

export const getDifficultyColor = (difficulty: Difficulty): string => {
  const colors = {
    [Difficulty.EASY]: 'success',
    [Difficulty.MEDIUM]: 'warning',
    [Difficulty.HARD]: 'error',
    [Difficulty.EXPERT]: 'secondary'
  }
  
  return colors[difficulty]
}

// Waypoint type utilities
export const getWaypointTypeLabel = (type: WaypointType): string => {
  const labels = {
    [WaypointType.START]: 'Départ',
    [WaypointType.END]: 'Arrivée',
    [WaypointType.WAYPOINT]: 'Point de passage'
  }
  
  return labels[type]
}

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6
}

export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Date utilities
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export const getRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Il y a moins d\'une minute'
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
  }
  
  return formatDate(date)
}

// Array utilities
export const groupBy = <T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// URL utilities
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  return searchParams.toString()
}

// Error handling
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    
    Error.captureStackTrace(this, this.constructor)
  }
}

// Constants
export const DIFFICULTY_LEVELS = Object.values(Difficulty)
export const WAYPOINT_TYPES = Object.values(WaypointType)

export const DEFAULT_MAP_CENTER = {
  latitude: 46.2276, // France center
  longitude: 2.2137
}

export const DEFAULT_MAP_ZOOM = 6

export const PAGINATION_LIMITS = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 10
}
