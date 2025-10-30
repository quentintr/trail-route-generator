import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Route } from '../../types/route'

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons for start and end markers
const startIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const endIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

interface MapViewProps {
  selectedRoute: Route | null
  center?: [number, number]
  zoom?: number
  isLoading?: boolean
  showZoomControls?: boolean
  onMapClick?: (lat: number, lng: number) => void
}

// Component to handle map updates
const MapUpdater: React.FC<{ route: Route | null }> = ({ route }) => {
  const map = useMap()

  useEffect(() => {
    if (route?.geometry?.coordinates) {
      const coordinates = route.geometry.coordinates
      if (coordinates.length > 1) {
        // Convert coordinates to LatLng format for Leaflet
        const latLngs = coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
        
        // Create bounds and fit map to route
        const bounds = L.latLngBounds(latLngs)
        map.fitBounds(bounds, { padding: [20, 20] })
      } else if (coordinates.length === 1) {
        // Single point - center on it
        const [lng, lat] = coordinates[0]
        map.setView([lat, lng], 15)
      }
    }
  }, [route, map])

  return null
}

export const MapView: React.FC<MapViewProps> = ({
  selectedRoute,
  center = [48.8566, 2.3522],
  zoom = 13,
  isLoading = false,
  showZoomControls = true,
}) => {
  // Convert route geometry to Leaflet format
  const routeCoordinates = selectedRoute?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng] as [number, number]) || []
  
  // Debug: Log coordinates to see what's happening
  if (selectedRoute) {
    console.log('MapView Debug:', {
      routeId: selectedRoute.id,
      originalCoordinates: selectedRoute.geometry?.coordinates?.slice(0, 3), // First 3 coordinates
      convertedCoordinates: routeCoordinates.slice(0, 3), // First 3 converted coordinates
      center: center,
      startPoint: routeCoordinates[0],
      endPoint: routeCoordinates[routeCoordinates.length - 1]
    })
  }
  
  // Get start and end points
  const startPoint = routeCoordinates[0]
  const endPoint = routeCoordinates[routeCoordinates.length - 1]

  // AFFICHAGE D'UNE ALERTE SI PAS DE POINTS
  if (!routeCoordinates.length) {
    alert('Problème : coordonnées de route VIDES ! (debug MapView)')
  }

  if (isLoading) {
    return (
      <div 
        data-testid="map-loading"
        className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center"
      >
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }

  return (
    <div style={{width: '100%', height: '100%'}}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={showZoomControls}
        data-testid="map-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          data-testid="tile-layer"
        />
        
        {/* Route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#3b82f6"
            weight={4}
            opacity={0.8}
            data-testid="polyline"
          />
        )}
        
        {/* Start marker */}
        {startPoint && (
          <Marker
            position={startPoint}
            icon={startIcon}
            data-testid="marker"
          />
        )}
        
        {/* End marker */}
        {endPoint && endPoint !== startPoint && (
          <Marker
            position={endPoint}
            icon={endIcon}
            data-testid="marker"
          />
        )}
        
        {/* Map updater component */}
        <MapUpdater route={selectedRoute} />
      </MapContainer>
      
      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white rounded-lg shadow-lg p-2">
          <div className="text-sm text-gray-600">
            {selectedRoute ? `${selectedRoute.distance}km • ${selectedRoute.duration}min` : 'No route selected'}
          </div>
        </div>
      </div>
      {/* Ajout debug visuel : centre et premier point */}
      <div style={{position: 'absolute', bottom: 0, left: 0, background: '#fff', zIndex:999, fontSize:14, padding:4, border:'1px solid #ccc'}}>
        <div>Centre carte (prop): {JSON.stringify(center)}</div>
        <div>Premier point traj. (lat,lng): {routeCoordinates[0] ? routeCoordinates[0].join(', ') : 'aucun'}</div>
      </div>
    </div>
  )
}
