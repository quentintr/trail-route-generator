import React from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { Route } from '../../types/route'

interface RouteDetailsProps {
  route: Route | null
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

// Generate elevation data from route profile or coordinates
const generateElevationData = (route: Route) => {
  // Si on a un profil d'élévation depuis le backend, l'utiliser
  if (route.elevation_profile && route.elevation_profile.length > 0) {
    return route.elevation_profile.map(point => ({
      distance: point.distance,
      elevation: point.elevation
    }))
  }
  
  // Sinon, générer un profil basique depuis les coordonnées
  if (!route.geometry?.coordinates) return []
  if (route.distance === undefined || route.distance === null || isNaN(route.distance)) return []
  
  const coordinates = route.geometry.coordinates
  const numPoints = Math.min(coordinates.length, 50) // Limiter pour performance
  
  // Générer un profil simple avec variations
  const data = []
  let currentElev = 150 // Altitude de départ
  
  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1)
    const variation = Math.sin(progress * Math.PI * 4) * 20 + 
                     Math.sin(progress * Math.PI * 8) * 10
    currentElev += variation * 0.1
    data.push({
      distance: progress * route.distance,
      elevation: Math.round(Math.max(100, currentElev))
    })
  }
  
  return data
}

export const RouteDetails: React.FC<RouteDetailsProps> = ({ route }) => {
  if (!route) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <h2 className="text-xl font-semibold mb-2">No route selected</h2>
          <p>Select a route to view detailed information</p>
        </div>
      </div>
    )
  }

  const elevationData = generateElevationData(route)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{route.name}</h2>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(route.difficulty ?? '-')}`}>
            {(route.difficulty && typeof route.difficulty === 'string' && route.difficulty.length > 0)
              ? route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1)
              : '-'}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getTerrainIcon(route.terrain_type ?? '')}</span>
            <span className="text-sm text-gray-600 capitalize">{route.terrain_type ?? '-'}</span>
          </div>
        </div>
      </div>

      {/* Route Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">
            {route.distance !== undefined && route.distance !== null 
              ? typeof route.distance === 'number' 
                ? route.distance < 1 
                  ? `${(route.distance * 1000).toFixed(0)}`
                  : route.distance.toFixed(2)
                : route.distance
              : '-'}
          </div>
          <div className="text-sm text-gray-500">
            Distance ({route.distance !== undefined && route.distance !== null && typeof route.distance === 'number' && route.distance < 1 ? 'm' : 'km'})
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{formatDuration(route.duration)}</div>
          <div className="text-sm text-gray-500">Duration</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{formatElevation(route.elevation)}</div>
          <div className="text-sm text-gray-500">Elevation Gain</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {route.distance !== undefined && route.duration !== undefined && 
             route.distance !== null && route.duration !== null &&
             !isNaN(route.distance) && !isNaN(route.duration) && route.duration > 0
              ? (route.distance / (route.duration / 60)).toFixed(1)
              : '-'}
          </div>
          <div className="text-sm text-gray-500">Avg Speed (km/h)</div>
        </div>
      </div>

      {/* Elevation Profile */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Elevation Profile</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={elevationData}>
              <XAxis 
                dataKey="distance" 
                tickFormatter={(value: number) => `${value}km`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                dataKey="elevation" 
                tickFormatter={(value: number) => `${value}m`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value: number, _name: string) => [`${value.toFixed(0)}m`, 'Elevation']}
                labelFormatter={(value: number) => `Distance: ${value.toFixed(1)}km`}
              />
              <Line 
                type="monotone" 
                dataKey="elevation" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Directions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Directions</h3>
        <div className="space-y-3">
          {route.waypoints?.map((waypoint, index) => (
            <div key={waypoint.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{waypoint.name || `Waypoint ${index + 1}`}</div>
                <div className="text-sm text-gray-500">
                  {waypoint.latitude !== undefined && waypoint.longitude !== undefined &&
                   !isNaN(waypoint.latitude) && !isNaN(waypoint.longitude)
                    ? `${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)}`
                    : 'Coordinates not available'}
                </div>
              </div>
            </div>
          )) || (
            <div className="text-gray-500 text-sm">No waypoints available</div>
          )}
        </div>
      </div>

      {/* Surface Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Surface Breakdown</h3>
        {route.surface_breakdown && route.surface_breakdown.length > 0 ? (
          <div className="space-y-3">
            {route.surface_breakdown.map((surface, index) => {
              const getSurfaceColor = (type: string) => {
                switch (type) {
                  case 'paved':
                    return 'bg-blue-500'
                  case 'unpaved':
                    return 'bg-orange-500'
                  case 'unknown':
                    return 'bg-gray-500'
                  default:
                    return 'bg-gray-400'
                }
              }
              
              const getSurfaceLabel = (type: string) => {
                switch (type) {
                  case 'paved':
                    return 'Paved (Asphalt/Concrete)'
                  case 'unpaved':
                    return 'Unpaved (Dirt/Gravel)'
                  case 'unknown':
                    return 'Unknown'
                  default:
                    return type.charAt(0).toUpperCase() + type.slice(1)
                }
              }
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTerrainIcon(surface.type === 'paved' ? 'paved' : surface.type === 'unpaved' ? 'unpaved' : 'mixed')}</span>
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {getSurfaceLabel(surface.type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {surface.percentage.toFixed(1)}% 
                      <span className="ml-1 text-gray-500">
                        ({(surface.distance / 1000).toFixed(2)} km)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`${getSurfaceColor(surface.type)} h-3 rounded-full transition-all duration-300`}
                      style={{ width: `${surface.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getTerrainIcon(route.terrain_type ?? '')}</span>
                <span className="capitalize">{route.terrain_type ?? 'mixed'}</span>
              </div>
              <span className="text-sm text-gray-500">100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Points of Interest */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Points of Interest</h3>
        <div className="text-gray-500 text-sm">
          Points of interest will be displayed here when available.
        </div>
      </div>

      {/* Route Info */}
      <div className="border-t pt-4">
        <div className="text-sm text-gray-500">
          <div>Created: {new Date(route.created_at).toLocaleDateString()}</div>
          <div>Last updated: {new Date(route.updated_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  )
}
