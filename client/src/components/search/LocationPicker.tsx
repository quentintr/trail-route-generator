import React, { useState, useEffect } from 'react'
import { MapIcon, LocationMarkerIcon } from '@heroicons/react/outline'
import { useGeolocation } from '../../hooks/useGeolocation'

interface LocationPickerProps {
  onLocationChange?: (location: { lat: number; lng: number; address?: string }) => void
  initialLocation?: { lat: number; lng: number; address?: string }
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ 
  onLocationChange, 
  initialLocation 
}) => {
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(
    initialLocation || null
  )
  const [isManualInput, setIsManualInput] = useState(false)
  const [manualAddress, setManualAddress] = useState('')
  const { getCurrentPosition, isLoading, error } = useGeolocation()

  // Update location when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation)
    }
  }, [initialLocation])

  const handleUseCurrentLocation = async () => {
    try {
      const position = await getCurrentPosition()
      if (position) {
        const newLocation = {
          lat: position.latitude,
          lng: position.longitude,
          address: `Current Location (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)})`,
        }
        setLocation(newLocation)
        onLocationChange?.(newLocation)
      }
    } catch (err) {
      console.error('Error getting current location:', err)
    }
  }

  const handleManualSubmit = () => {
    // Simple geocoding simulation - in real app, use a geocoding service
    const coords = manualAddress.split(',').map(coord => parseFloat(coord.trim()))
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      const newLocation = {
        lat: coords[0],
        lng: coords[1],
        address: manualAddress,
      }
      setLocation(newLocation)
      onLocationChange?.(newLocation)
    } else {
      // For demo purposes, use Paris coordinates
      const newLocation = {
        lat: 48.8566,
        lng: 2.3522,
        address: manualAddress || 'Paris, France',
      }
      setLocation(newLocation)
      onLocationChange?.(newLocation)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Location Button */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={isLoading}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <LocationMarkerIcon className="h-5 w-5 mr-2" />
        {isLoading ? 'Getting location...' : 'Use my current location'}
      </button>

      {/* Manual Input Toggle */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsManualInput(!isManualInput)}
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          {isManualInput ? 'Hide manual input' : 'Or enter location manually'}
        </button>
      </div>

      {/* Manual Input */}
      {isManualInput && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Enter address or coordinates (lat, lng)"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            Set Location
          </button>
        </div>
      )}

      {/* Selected Location Display */}
      {location && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center">
            <MapIcon className="h-5 w-5 text-green-400 mr-2" />
            <div className="text-sm text-green-800">
              <div className="font-medium">Selected Location</div>
              <div>{location.address}</div>
              <div className="text-xs text-green-600">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
    </div>
  )
}