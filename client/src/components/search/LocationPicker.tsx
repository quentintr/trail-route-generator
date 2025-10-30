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

  // Auto-detect location on component mount
  useEffect(() => {
    const autoDetectLocation = async () => {
      try {
        const position = await getCurrentPosition()
        if (position) {
          const newLocation = {
            lat: position.latitude,
            lng: position.longitude,
            address: `Position actuelle (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)})`,
          }
          setLocation(newLocation)
          onLocationChange?.(newLocation)
        }
      } catch (err) {
        console.log('Auto-detection failed, user will need to set location manually')
      }
    }

    // Only auto-detect if no initial location is provided
    if (!initialLocation) {
      autoDetectLocation()
    }
  }, [initialLocation, getCurrentPosition, onLocationChange])

  const handleUseCurrentLocation = async () => {
    try {
      const position = await getCurrentPosition()
      if (position) {
        console.log('GPS Position detected:', {
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy
        })
        
        // Vérifier si la position semble raisonnable (pas en Afrique si vous êtes à Toulouse)
        const isReasonablePosition = position.latitude > 40 && position.latitude < 50 && 
                                   position.longitude > -10 && position.longitude < 10
        
        if (!isReasonablePosition) {
          console.warn('Position seems incorrect - might be VPN/proxy issue')
          alert(`Attention: Votre position détectée (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}) semble incorrecte. Cela peut être dû à un VPN ou à des paramètres réseau. Vous pouvez saisir manuellement vos coordonnées.`)
        }
        
        const newLocation = {
          lat: position.latitude,
          lng: position.longitude,
          address: `Position actuelle (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)})`,
        }
        setLocation(newLocation)
        onLocationChange?.(newLocation)
      }
    } catch (err) {
      console.error('Error getting current location:', err)
      alert('Erreur de géolocalisation. Veuillez autoriser l\'accès à votre position ou saisir manuellement vos coordonnées.')
    }
  }

  const handleManualSubmit = () => {
    // Accepter les coordonnées au format "lat, lng" ou "lng, lat"
    const coords = manualAddress.split(',').map(coord => parseFloat(coord.trim()))
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      // Détecter automatiquement si c'est lat,lng ou lng,lat
      let lat, lng
      if (Math.abs(coords[0]) <= 90 && Math.abs(coords[1]) <= 180) {
        // Premier nombre <= 90, donc probablement lat,lng
        lat = coords[0]
        lng = coords[1]
      } else {
        // Sinon, probablement lng,lat
        lng = coords[0]
        lat = coords[1]
      }
      
      const newLocation = {
        lat: lat,
        lng: lng,
        address: `Coordonnées manuelles (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      }
      setLocation(newLocation)
      onLocationChange?.(newLocation)
      setIsManualInput(false)
    } else {
      // Si ce n'est pas des coordonnées, essayer de géocoder (simulation)
      const newLocation = {
        lat: 43.6047, // Toulouse par défaut si pas de coordonnées valides
        lng: 1.4442,
        address: manualAddress || 'Toulouse, France',
      }
      setLocation(newLocation)
      onLocationChange?.(newLocation)
      setIsManualInput(false)
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
            placeholder="Ex: 43.6047, 1.4442 ou Toulouse"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500">
            Saisissez vos coordonnées GPS (latitude, longitude) ou une ville
          </div>
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