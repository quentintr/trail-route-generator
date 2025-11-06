import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Route } from '../../types/route'

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface RoutePreviewProps {
  route: Route
  height?: string
  className?: string
}

// Component to fit map bounds to route
function FitBounds({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap()
  
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates.map(coord => [coord[1], coord[0]] as [number, number]))
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [map, coordinates])
  
  return null
}

export const RoutePreview: React.FC<RoutePreviewProps> = ({ 
  route, 
  height = 'h-20',
  className = '' 
}) => {
  const coordinates = route.geometry?.coordinates || []
  
  if (coordinates.length === 0) {
    return (
      <div className={`w-full ${height} bg-gray-100 rounded flex items-center justify-center ${className}`}>
        <div className="text-gray-400 text-sm">Route Preview</div>
      </div>
    )
  }
  
  // Convert GeoJSON coordinates [lon, lat] to Leaflet format [lat, lon]
  const leafletCoordinates = coordinates.map(coord => [coord[1], coord[0]] as [number, number])
  
  // Calculate center
  const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length
  const centerLon = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length
  
  return (
    <div className={`w-full ${height} rounded overflow-hidden ${className}`}>
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={13}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={leafletCoordinates}
          pathOptions={{
            color: '#6366f1',
            weight: 4,
            opacity: 0.8
          }}
        />
        <FitBounds coordinates={coordinates as [number, number][]} />
      </MapContainer>
    </div>
  )
}

