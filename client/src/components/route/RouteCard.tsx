import React from 'react'
import { Route } from '../../types/route'
import { RoutePreview } from './RoutePreview'

interface RouteCardProps {
  route: Route
  isSelected?: boolean
  isLoading?: boolean
  onSelect?: (route: Route) => void
  onSave?: (route: Route) => void
}

const formatDuration = (minutes: number | undefined): string => {
  if (minutes === undefined || minutes === null || isNaN(minutes)) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
}

const formatElevation = (meters: number | undefined): string => {
  if (meters === undefined || meters === null || isNaN(meters)) return '-'
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)}km`
  }
  return `${meters}m`
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'hard':
      return 'bg-orange-100 text-orange-800'
    case 'expert':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getTerrainIcon = (terrain: string) => {
  switch (terrain) {
    case 'paved':
      return '🛣️'
    case 'unpaved':
      return '🥾'
    case 'mixed':
      return '🔄'
    default:
      return '📍'
  }
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isSelected = false,
  isLoading = false,
  onSelect,
  onSave,
}) => {
  if (isLoading) {
    return (
      <div 
        data-testid="route-card-loading"
        className="bg-white rounded-lg shadow-md p-4 animate-pulse"
      >
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded mb-4"></div>
        <div className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="route-card"
      className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-indigo-500' : ''
      }`}
      onClick={() => onSelect?.(route)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {route.name}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(route.difficulty ?? '-')}`}>
          {(route.difficulty && typeof route.difficulty === 'string' && route.difficulty.length > 0)
            ? route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1)
            : '-'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {route.distance !== undefined && route.distance !== null 
              ? typeof route.distance === 'number' 
                ? route.distance < 1 
                  ? `${(route.distance * 1000).toFixed(0)}`
                  : route.distance.toFixed(2)
                : route.distance
              : '-'}
          </div>
          <div className="text-xs text-gray-500">
            {route.distance !== undefined && route.distance !== null && typeof route.distance === 'number' && route.distance < 1 
              ? 'm' 
              : 'km'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{formatDuration(route.duration)}</div>
          <div className="text-xs text-gray-500">duration</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{formatElevation(route.elevation)}</div>
          <div className="text-xs text-gray-500">elevation</div>
        </div>
      </div>

      {/* Terrain */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTerrainIcon(route.terrain_type ?? '')}</span>
          <span className="text-sm text-gray-600 capitalize">{route.terrain_type ?? '-'}</span>
        </div>
        <div className="text-xs text-gray-500">
          Surface
        </div>
      </div>

      {/* Map thumbnail */}
      {route.geometry && (
        <div className="mb-4">
          <RoutePreview route={route} height="h-20" />
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect?.(route)
          }}
          className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Select this route
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSave?.(route)
          }}
          className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Save for later
        </button>
      </div>
    </div>
  )
}
