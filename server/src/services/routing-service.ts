/**
 * Service de routage utilisant OSRM (Open Source Routing Machine)
 * 
 * Ce service fournit des fonctionnalités de calcul d'itinéraires
 * optimisés pour la randonnée et la course à pied.
 * 
 * Fonctionnalités :
 * - Calcul d'itinéraires entre deux points
 * - Calcul de distance et durée
 * - Support des profils de marche/course
 * - Gestion des alternatives d'itinéraires
 * - Optimisation des itinéraires multi-points
 * 
 * Documentation OSRM : http://project-osrm.org/docs/v5.24.0/api/
 */

import axios, { AxiosResponse } from 'axios'
import { OSRM_CONFIG, ERROR_MESSAGES, RATE_LIMITING } from '../config/osm-config'

/**
 * Types pour les requêtes OSRM
 */
export interface OSRMRouteRequest {
  coordinates: [number, number][] // [longitude, latitude]
  profile: 'foot' | 'bike'
  alternatives?: boolean
  steps?: boolean
  geometries?: 'polyline' | 'geojson'
  overview?: 'simplified' | 'full' | 'false'
  continue_straight?: boolean
  annotations?: boolean
  radiuses?: number[]
  bearings?: [number, number][]
  waypoints?: number[]
}

export interface OSRMTableRequest {
  coordinates: [number, number][]
  profile: 'foot' | 'bike'
  sources?: number[]
  destinations?: number[]
  annotations?: 'duration' | 'distance' | 'duration,distance'
}

/**
 * Types pour les réponses OSRM
 */
export interface OSRMRouteResponse {
  code: 'Ok' | 'NoRoute' | 'InvalidInput' | 'NoSegment'
  routes: OSRMRoute[]
  waypoints: OSRMWaypoint[]
}

export interface OSRMRoute {
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  legs: OSRMLeg[]
  distance: number // en mètres
  duration: number // en secondes
  weight: number
  weight_name: string
}

export interface OSRMLeg {
  distance: number
  duration: number
  weight: number
  summary: string
  steps: OSRMStep[]
}

export interface OSRMStep {
  distance: number
  duration: number
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  maneuver: {
    bearing_after: number
    bearing_before: number
    location: [number, number]
    type: number
    instruction: string
  }
  mode: string
  name: string
}

export interface OSRMWaypoint {
  distance: number
  name: string
  location: [number, number]
  hint: string
}

export interface OSRMTableResponse {
  code: 'Ok' | 'NoRoute' | 'InvalidInput'
  durations?: number[][]
  distances?: number[][]
  sources: OSRMWaypoint[]
  destinations: OSRMWaypoint[]
}

/**
 * Types pour les résultats de routage
 */
export interface RouteResult {
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  distance: number // en kilomètres
  duration: number // en minutes
  legs: RouteLeg[]
  summary: {
    totalDistance: number
    totalDuration: number
    averageSpeed: number // km/h
    elevationGain?: number
    difficulty: 'easy' | 'medium' | 'hard'
  }
}

export interface RouteLeg {
  distance: number
  duration: number
  instruction: string
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}

export interface RouteOptions {
  profile: 'foot' | 'bike'
  alternatives?: boolean
  steps?: boolean
  overview?: 'simplified' | 'full' | 'false'
  continueStraight?: boolean
  annotations?: boolean
}

/**
 * Service de routage OSRM
 */
export class RoutingService {
  private requestCount = 0
  private lastRequestTime = 0

  /**
   * Calcule un itinéraire entre deux points
   * 
   * @param start - Point de départ [longitude, latitude]
   * @param end - Point d'arrivée [longitude, latitude]
   * @param options - Options de routage
   * @returns Résultat de l'itinéraire
   */
  async calculateRoute(
    start: [number, number],
    end: [number, number],
    options: RouteOptions = { profile: 'foot' }
  ): Promise<RouteResult> {
    try {
      // Valider les coordonnées
      if (!this.validateCoordinates(start) || !this.validateCoordinates(end)) {
        throw new Error(ERROR_MESSAGES.INVALID_COORDINATES)
      }

      // Appliquer la limitation de taux
      await this.enforceRateLimit()

      // Construire la requête OSRM
      const request: OSRMRouteRequest = {
        coordinates: [start, end],
        profile: options.profile,
        alternatives: options.alternatives || false,
        steps: options.steps || true,
        geometries: 'geojson',
        overview: options.overview || 'simplified',
        continue_straight: options.continueStraight || false,
        annotations: options.annotations || true
      }

      // Appeler l'API OSRM
      const response = await this.callOSRMAPI('/route/v1', request)
      
      if (response.code !== 'Ok' || !response.routes.length) {
        throw new Error(ERROR_MESSAGES.NO_PATHS_FOUND)
      }

      // Transformer la réponse
      return this.transformOSRMResponse(response.routes[0])
    } catch (error) {
      console.error('Erreur lors du calcul de route:', error)
      throw new Error(ERROR_MESSAGES.OSRM_ERROR)
    }
  }

  /**
   * Calcule un itinéraire avec plusieurs points de passage
   * 
   * @param waypoints - Points de passage [longitude, latitude][]
   * @param options - Options de routage
   * @returns Résultat de l'itinéraire
   */
  async calculateRouteWithWaypoints(
    waypoints: [number, number][],
    options: RouteOptions = { profile: 'foot' }
  ): Promise<RouteResult> {
    try {
      if (waypoints.length < 2) {
        throw new Error('Au moins deux points sont requis')
      }

      // Valider tous les points
      for (const point of waypoints) {
        if (!this.validateCoordinates(point)) {
          throw new Error(ERROR_MESSAGES.INVALID_COORDINATES)
        }
      }

      await this.enforceRateLimit()

      const request: OSRMRouteRequest = {
        coordinates: waypoints,
        profile: options.profile,
        alternatives: options.alternatives || false,
        steps: options.steps || true,
        geometries: 'geojson',
        overview: options.overview || 'simplified',
        continue_straight: options.continueStraight || false,
        annotations: options.annotations || true
      }

      const response = await this.callOSRMAPI('/route/v1', request)
      
      if (response.code !== 'Ok' || !response.routes.length) {
        throw new Error(ERROR_MESSAGES.NO_PATHS_FOUND)
      }

      return this.transformOSRMResponse(response.routes[0])
    } catch (error) {
      console.error('Erreur lors du calcul de route multi-points:', error)
      throw new Error(ERROR_MESSAGES.OSRM_ERROR)
    }
  }

  /**
   * Calcule la matrice de distances entre plusieurs points
   * 
   * @param coordinates - Points de coordonnées
   * @param options - Options de calcul
   * @returns Matrice de distances et durées
   */
  async calculateDistanceMatrix(
    coordinates: [number, number][],
    options: {
      profile?: 'foot' | 'bike'
      sources?: number[]
      destinations?: number[]
    } = {}
  ): Promise<{
    durations: number[][]
    distances: number[][]
    sources: OSRMWaypoint[]
    destinations: OSRMWaypoint[]
  }> {
    try {
      if (coordinates.length < 2) {
        throw new Error('Au moins deux points sont requis')
      }

      await this.enforceRateLimit()

      const request: OSRMTableRequest = {
        coordinates,
        profile: options.profile || 'foot',
        sources: options.sources,
        destinations: options.destinations,
        annotations: 'duration,distance'
      }

      const response = await this.callOSRMAPI('/table/v1', request)
      
      if (response.code !== 'Ok') {
        throw new Error('Erreur lors du calcul de la matrice de distances')
      }

      return {
        durations: response.durations || [],
        distances: response.distances || [],
        sources: response.sources,
        destinations: response.destinations
      }
    } catch (error) {
      console.error('Erreur lors du calcul de la matrice de distances:', error)
      throw new Error(ERROR_MESSAGES.OSRM_ERROR)
    }
  }

  /**
   * Calcule la distance et durée entre deux points
   * 
   * @param start - Point de départ
   * @param end - Point d'arrivée
   * @param profile - Profil de routage
   * @returns Distance en km et durée en minutes
   */
  async calculateDistanceAndDuration(
    start: [number, number],
    end: [number, number],
    profile: 'foot' | 'bike' = 'foot'
  ): Promise<{ distance: number; duration: number }> {
    try {
      const route = await this.calculateRoute(start, end, { 
        profile, 
        steps: false, 
        overview: 'false' 
      })
      
      return {
        distance: route.summary.totalDistance,
        duration: route.summary.totalDuration
      }
    } catch (error) {
      console.error('Erreur lors du calcul de distance/durée:', error)
      throw new Error(ERROR_MESSAGES.OSRM_ERROR)
    }
  }

  /**
   * Trouve l'itinéraire le plus court entre plusieurs points
   * 
   * @param coordinates - Points de coordonnées
   * @param profile - Profil de routage
   * @returns Itinéraire optimisé
   */
  async findShortestRoute(
    coordinates: [number, number][],
    profile: 'foot' | 'bike' = 'foot'
  ): Promise<RouteResult> {
    try {
      if (coordinates.length < 2) {
        throw new Error('Au moins deux points sont requis')
      }

      // Pour l'optimisation, on utilise l'API de routage avec waypoints
      return await this.calculateRouteWithWaypoints(coordinates, { 
        profile,
        steps: true,
        overview: 'full'
      })
    } catch (error) {
      console.error('Erreur lors de l\'optimisation de route:', error)
      throw new Error(ERROR_MESSAGES.OSRM_ERROR)
    }
  }

  /**
   * Appelle l'API OSRM
   */
  private async callOSRMAPI(
    endpoint: string,
    params: OSRMRouteRequest | OSRMTableRequest
  ): Promise<OSRMRouteResponse | OSRMTableResponse> {
    try {
      const url = `${OSRM_CONFIG.endpoint}${endpoint}/${params.profile}`
      
      const response: AxiosResponse<OSRMRouteResponse | OSRMTableResponse> = 
        await axios.get(url, {
          params: this.buildQueryParams(params),
          timeout: OSRM_CONFIG.timeout,
          headers: {
            'User-Agent': 'TrailRouteGenerator/1.0'
          }
        })

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error(ERROR_MESSAGES.OSRM_TIMEOUT)
        }
        if (error.response?.status === 429) {
          throw new Error(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED)
        }
      }
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR)
    }
  }

  /**
   * Construit les paramètres de requête pour OSRM
   */
  private buildQueryParams(params: OSRMRouteRequest | OSRMTableRequest): Record<string, any> {
    const queryParams: Record<string, any> = {}

    // Coordonnées
    queryParams.coordinates = params.coordinates.map(coord => 
      `${coord[0]},${coord[1]}`
    ).join(';')

    // Options spécifiques aux routes
    if ('alternatives' in params) {
      if (params.alternatives !== undefined) queryParams.alternatives = params.alternatives
      if (params.steps !== undefined) queryParams.steps = params.steps
      if (params.geometries) queryParams.geometries = params.geometries
      if (params.overview) queryParams.overview = params.overview
      if (params.continue_straight !== undefined) queryParams.continue_straight = params.continue_straight
      if (params.annotations !== undefined) queryParams.annotations = params.annotations
      if (params.radiuses) queryParams.radiuses = params.radiuses.join(';')
      if (params.bearings) queryParams.bearings = params.bearings.map(bearing => 
        `${bearing[0]},${bearing[1]}`
      ).join(';')
      if (params.waypoints) queryParams.waypoints = params.waypoints.join(';')
    }

    // Options spécifiques aux tables
    if ('sources' in params) {
      if (params.sources) queryParams.sources = params.sources.join(';')
      if (params.destinations) queryParams.destinations = params.destinations.join(';')
      if (params.annotations) queryParams.annotations = params.annotations
    }

    return queryParams
  }

  /**
   * Transforme la réponse OSRM en format RouteResult
   */
  private transformOSRMResponse(route: OSRMRoute): RouteResult {
    const legs: RouteLeg[] = route.legs.map(leg => ({
      distance: leg.distance / 1000, // Convertir en km
      duration: leg.duration / 60, // Convertir en minutes
      instruction: leg.summary,
      geometry: leg.steps[0]?.geometry || {
        type: 'LineString',
        coordinates: []
      }
    }))

    const totalDistance = route.distance / 1000 // km
    const totalDuration = route.duration / 60 // minutes
    const averageSpeed = totalDistance / (totalDuration / 60) // km/h

    return {
      geometry: route.geometry,
      distance: totalDistance,
      duration: totalDuration,
      legs,
      summary: {
        totalDistance,
        totalDuration,
        averageSpeed,
        difficulty: this.calculateDifficulty(averageSpeed, totalDistance)
      }
    }
  }

  /**
   * Calcule la difficulté d'un itinéraire
   */
  private calculateDifficulty(averageSpeed: number, distance: number): 'easy' | 'medium' | 'hard' {
    // Logique basée sur la vitesse moyenne et la distance
    if (averageSpeed < 3 || distance > 20) {
      return 'hard'
    }
    if (averageSpeed < 5 || distance > 10) {
      return 'medium'
    }
    return 'easy'
  }

  /**
   * Valide des coordonnées géographiques
   */
  private validateCoordinates(coordinates: [number, number]): boolean {
    const [lon, lat] = coordinates
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  }

  /**
   * Applique la limitation de taux
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < RATE_LIMITING.delayBetweenRequests) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMITING.delayBetweenRequests - timeSinceLastRequest)
      )
    }

    this.requestCount++
    this.lastRequestTime = Date.now()

    if (this.requestCount >= RATE_LIMITING.requestsPerMinute) {
      await new Promise(resolve => setTimeout(resolve, 60000))
      this.requestCount = 0
    }
  }
}

/**
 * Instance singleton du service de routage
 */
export const routingService = new RoutingService()

/**
 * Fonctions utilitaires pour le routage
 */
export const routingUtils = {
  /**
   * Calcule la distance à vol d'oiseau entre deux points
   */
  calculateHaversineDistance: (
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 6371 // Rayon de la Terre en km
    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  },

  /**
   * Formate une durée en minutes en texte lisible
   */
  formatDuration: (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins}min`
  },

  /**
   * Formate une distance en kilomètres en texte lisible
   */
  formatDistance: (kilometers: number): string => {
    if (kilometers < 1) {
      return `${Math.round(kilometers * 1000)}m`
    }
    return `${kilometers.toFixed(1)}km`
  },

  /**
   * Calcule le facteur de difficulté d'un itinéraire
   */
  calculateDifficultyFactor: (distance: number, elevation: number): number => {
    // Facteur basé sur la distance et l'élévation
    const distanceFactor = Math.pow(distance / 10, 1.2)
    const elevationFactor = Math.pow(elevation / 1000, 1.5)
    return Math.min(distanceFactor + elevationFactor, 10) // Max 10
  }
}

/**
 * Convertit les degrés en radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}
