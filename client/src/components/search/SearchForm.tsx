import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useGenerateRoute } from '../../hooks/useGenerateRoute'
import { LocationPicker } from './LocationPicker'

// Schema de validation Zod
const searchSchema = z.object({
  distance: z.number().min(1, 'Distance must be at least 1km').max(50, 'Distance cannot exceed 50km'),
  pace: z.string().min(1, 'Pace is required').regex(/^\d+:\d{2}$/, 'Pace must be in format MM:SS'),
  terrain_type: z.enum(['paved', 'unpaved', 'mixed'], {
    required_error: 'Please select a terrain type',
  }),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
})

type SearchFormData = z.infer<typeof searchSchema>

interface SearchFormProps {
  onRouteGenerated?: (routes: any[]) => void
}

export const SearchForm: React.FC<SearchFormProps> = ({ onRouteGenerated }) => {
  const navigate = useNavigate()
  const { generateRoute, isLoading, error } = useGenerateRoute()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      distance: 10,
      pace: '5:00',
      terrain_type: 'mixed',
      location: {
        lat: 0, // Pas de position par défaut
        lng: 0,
        address: 'Cliquez sur "Use my current location"',
      },
    },
  })

  const distance = watch('distance')
  const terrainType = watch('terrain_type')

  const onSubmit = async (data: SearchFormData) => {
    try {
      console.log('Submitting form with data:', data)
      const response = await generateRoute({
        start_lat: data.location.lat,
        start_lon: data.location.lng,
        distance: data.distance,
        terrain_type: data.terrain_type,
        // Convert pace from MM:SS to minutes per km
        pace: data.pace.split(':').reduce((acc, time, i) => acc + parseInt(time) / Math.pow(60, i), 0),
      })

      console.log('Received response:', response)
      if (response && response.length > 0) {
        console.log('Navigating to results with routes:', response)
        onRouteGenerated?.(response)
        console.log('About to navigate to /routes/results')
        navigate('/routes/results', { state: { routes: response } })
        console.log('Navigation called')
      } else {
        console.error('No routes received or empty array')
      }
    } catch (err) {
      console.error('Error generating routes:', err)
    }
  }

  const handleLocationChange = (location: { lat: number; lng: number; address?: string }) => {
    setValue('location', location, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Distance Slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Distance: {distance} km
        </label>
        <input
          {...register('distance', { valueAsNumber: true })}
          type="range"
          min="1"
          max="50"
          step="0.5"
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1km</span>
          <span>50km</span>
        </div>
        {errors.distance && (
          <p className="mt-1 text-sm text-red-600">{errors.distance.message}</p>
        )}
      </div>

      {/* Pace Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Pace (min/km)
        </label>
        <input
          {...register('pace')}
          type="text"
          placeholder="5:00"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">Format: MM:SS (e.g., 5:30 for 5 minutes 30 seconds per km)</p>
        {errors.pace && (
          <p className="mt-1 text-sm text-red-600">{errors.pace.message}</p>
        )}
      </div>

      {/* Terrain Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Terrain Type
        </label>
        <div className="space-y-2">
          {[
            { value: 'paved', label: 'Road', icon: '🛣️', description: 'Paved roads and bike paths' },
            { value: 'unpaved', label: 'Trail', icon: '🥾', description: 'Natural trails and paths' },
            { value: 'mixed', label: 'Mixed', icon: '🔄', description: 'Combination of both' },
          ].map((option) => (
            <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                {...register('terrain_type')}
                type="radio"
                value={option.value}
                className="sr-only"
              />
              <div className={`flex-1 flex items-center space-x-3 ${terrainType === option.value ? 'text-indigo-600' : 'text-gray-700'}`}>
                <span className="text-2xl">{option.icon}</span>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${
                terrainType === option.value 
                  ? 'border-indigo-600 bg-indigo-600' 
                  : 'border-gray-300'
              }`}>
                {terrainType === option.value && (
                  <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                )}
              </div>
            </label>
          ))}
        </div>
        {errors.terrain_type && (
          <p className="mt-1 text-sm text-red-600">{errors.terrain_type.message}</p>
        )}
      </div>

      {/* Location Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Starting Location
        </label>
        <LocationPicker onLocationChange={handleLocationChange} />
        {errors.location && (
          <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error generating routes</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Routes...
          </div>
        ) : (
          'Generate My Route'
        )}
      </button>
    </form>
  )
}