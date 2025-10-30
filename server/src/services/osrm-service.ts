/**
 * Service de routage utilisant OSRM (Open Source Routing Machine)
 * 
 * Ce service utilise l'API OSRM pour générer des routes réalistes
 * qui suivent les vraies routes OpenStreetMap.
 */

import axios from 'axios'

export interface OSRMRouteRequest {
  coordinates: [number, number][] // [longitude, latitude]
  profile: 'foot' | 'bike' | 'car'
  alternatives?: boolean
  steps?: boolean
  geometries?: 'polyline' | 'polyline6' | 'geojson'
  overview?: 'simplified' | 'full' | 'false'
}

export interface OSRMRouteResponse {
  code: string
  routes: Array<{
    geometry: {
      coordinates: [number, number][]
      type: 'LineString'
    }
    legs: Array<{
      distance: number
      duration: number
      steps: Array<{
        distance: number
        duration: number
        geometry: {
          coordinates: [number, number][]
          type: 'LineString'
        }
      }>
    }>
    distance: number
    duration: number
    weight_name: string
    weight: number
  }>
  waypoints: Array<{
    hint: string
    distance: number
    name: string
    location: [number, number]
  }>
}

export interface RouteGenerationOptions {
  start_lat: number
  start_lon: number
  distance: number // en km
  terrain_type: 'paved' | 'unpaved' | 'mixed'
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  pace: number // minutes per km
}

export interface GeneratedRoute {
  id: string
  name: string
  description: string
  distance: number
  duration: number
  elevation: number
  difficulty: string
  terrain_type: string
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  waypoints: Array<{
    id: string
    route_id: string
    name: string
    latitude: number
    longitude: number
    order: number
    created_at: string
  }>
}

class OSRMService {
  private baseUrl: string
  private timeout: number

  constructor() {
    // Utiliser l'instance publique d'OSRM
    this.baseUrl = 'https://router.project-osrm.org'
    this.timeout = 30000 // 30 secondes
  }

  /**
   * Génère des routes en boucle en utilisant OSRM
   */
  async generateLoopRoutes(options: RouteGenerationOptions): Promise<GeneratedRoute[]> {
    console.log(`Generating OSRM routes: ${options.distance}km, ${options.terrain_type}, ${options.difficulty}`)
    
    try {
      const routes: GeneratedRoute[] = []
      
      // Générer plusieurs variantes de routes en boucle
      const variants = await this.generateRouteVariants(options)
      
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i]
        const routeId = `route_${Date.now()}_${i}`
        
        const route: GeneratedRoute = {
          id: routeId,
          name: `Route ${i + 1} - ${this.getRouteName(options.terrain_type, variant.distance)}`,
          description: this.getRouteDescription(
            options.terrain_type,
            variant.distance,
            variant.elevation || 0,
            options.difficulty
          ),
          distance: Math.round(variant.distance * 10) / 10,
          duration: Math.round(variant.duration / 60),
          elevation: Math.round(variant.elevation || 0),
          difficulty: options.difficulty,
          terrain_type: options.terrain_type,
          geometry: variant.geometry,
          waypoints: [
            {
              id: `${routeId}_start`,
              route_id: routeId,
              name: 'Start',
              latitude: options.start_lat,
              longitude: options.start_lon,
              order: 0,
              created_at: new Date().toISOString(),
            },
            {
              id: `${routeId}_end`,
              route_id: routeId,
              name: 'End',
              latitude: variant.geometry.coordinates[variant.geometry.coordinates.length - 1][1],
              longitude: variant.geometry.coordinates[variant.geometry.coordinates.length - 1][0],
              order: variant.geometry.coordinates.length - 1,
              created_at: new Date().toISOString(),
            },
          ],
        }
        
        routes.push(route)
      }
      
      console.log(`Successfully generated ${routes.length} OSRM routes`)
      return routes
      
    } catch (error) {
      console.error('Error generating OSRM routes:', error)
      throw new Error('Failed to generate routes using OSRM')
    }
  }

  /**
   * Génère plusieurs variantes de routes en boucle
   */
  private async generateRouteVariants(options: RouteGenerationOptions): Promise<Array<{
    distance: number
    duration: number
    elevation: number
    geometry: { type: 'LineString'; coordinates: [number, number][] }
  }>> {
    const variants = []
    
    // Variante 1: Route circulaire simple
    try {
      const circularRoute = await this.generateCircularRoute(options)
      if (circularRoute) {
        variants.push(circularRoute)
      }
    } catch (error) {
      console.warn('Failed to generate circular route:', error)
    }
    
    // Variante 2: Route avec détours
    try {
      const detourRoute = await this.generateDetourRoute(options)
      if (detourRoute) {
        variants.push(detourRoute)
      }
    } catch (error) {
      console.warn('Failed to generate detour route:', error)
    }
    
    // Variante 3: Route alternative
    try {
      const alternativeRoute = await this.generateAlternativeRoute(options)
      if (alternativeRoute) {
        variants.push(alternativeRoute)
      }
    } catch (error) {
      console.warn('Failed to generate alternative route:', error)
    }
    
    return variants
  }

  /**
   * Génère une route circulaire simple avec ajustement dynamique
   */
  private async generateCircularRoute(options: RouteGenerationOptions): Promise<{
    distance: number
    duration: number
    elevation: number
    geometry: { type: 'LineString'; coordinates: [number, number][] }
  } | null> {
    let radius = this.calculateRadius(options.distance)
    let attempts = 0
    const maxAttempts = 5
    
    while (attempts < maxAttempts) {
      const waypoints = this.generateCircularWaypoints(options.start_lat, options.start_lon, radius)
      
      const route = await this.getRoute(waypoints, options.terrain_type)
      if (!route) return null
      
      const actualDistance = route.distance / 1000 // Convertir en km
      const distanceRatio = actualDistance / options.distance
      
      console.log(`Attempt ${attempts + 1}: target ${options.distance}km, actual ${actualDistance.toFixed(1)}km, ratio ${distanceRatio.toFixed(2)}`)
      
      // Si la distance est acceptable (entre 80% et 120% de la cible)
      if (distanceRatio >= 0.8 && distanceRatio <= 1.2) {
        return {
          distance: actualDistance,
          duration: route.duration,
          elevation: 0,
          geometry: route.geometry
        }
      }
      
      // Ajuster le rayon pour la prochaine tentative
      if (distanceRatio > 1.2) {
        // Route trop longue, réduire le rayon
        radius *= 0.8
      } else {
        // Route trop courte, augmenter le rayon
        radius *= 1.2
      }
      
      attempts++
    }
    
    // Si on n'a pas trouvé une distance acceptable, retourner la dernière tentative
    const waypoints = this.generateCircularWaypoints(options.start_lat, options.start_lon, radius)
    const route = await this.getRoute(waypoints, options.terrain_type)
    if (!route) return null
    
    return {
      distance: route.distance / 1000,
      duration: route.duration,
      elevation: 0,
      geometry: route.geometry
    }
  }

  /**
   * Génère une route avec détours avec ajustement dynamique
   */
  private async generateDetourRoute(options: RouteGenerationOptions): Promise<{
    distance: number
    duration: number
    elevation: number
    geometry: { type: 'LineString'; coordinates: [number, number][] }
  } | null> {
    let radius = this.calculateRadius(options.distance) * 0.9 // Légèrement plus petit pour les détours
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts) {
      const waypoints = this.generateDetourWaypoints(options.start_lat, options.start_lon, radius)
      
      const route = await this.getRoute(waypoints, options.terrain_type)
      if (!route) return null
      
      const actualDistance = route.distance / 1000
      const distanceRatio = actualDistance / options.distance
      
      if (distanceRatio >= 0.8 && distanceRatio <= 1.2) {
        return {
          distance: actualDistance,
          duration: route.duration,
          elevation: 0,
          geometry: route.geometry
        }
      }
      
      // Ajuster le rayon
      if (distanceRatio > 1.2) {
        radius *= 0.8
      } else {
        radius *= 1.2
      }
      
      attempts++
    }
    
    // Dernière tentative
    const waypoints = this.generateDetourWaypoints(options.start_lat, options.start_lon, radius)
    const route = await this.getRoute(waypoints, options.terrain_type)
    if (!route) return null
    
    return {
      distance: route.distance / 1000,
      duration: route.duration,
      elevation: 0,
      geometry: route.geometry
    }
  }

  /**
   * Génère une route alternative avec ajustement dynamique
   */
  private async generateAlternativeRoute(options: RouteGenerationOptions): Promise<{
    distance: number
    duration: number
    elevation: number
    geometry: { type: 'LineString'; coordinates: [number, number][] }
  } | null> {
    let radius = this.calculateRadius(options.distance) * 1.1 // Légèrement plus grand pour les alternatives
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts) {
      const waypoints = this.generateAlternativeWaypoints(options.start_lat, options.start_lon, radius)
      
      const route = await this.getRoute(waypoints, options.terrain_type)
      if (!route) return null
      
      const actualDistance = route.distance / 1000
      const distanceRatio = actualDistance / options.distance
      
      if (distanceRatio >= 0.8 && distanceRatio <= 1.2) {
        return {
          distance: actualDistance,
          duration: route.duration,
          elevation: 0,
          geometry: route.geometry
        }
      }
      
      // Ajuster le rayon
      if (distanceRatio > 1.2) {
        radius *= 0.8
      } else {
        radius *= 1.2
      }
      
      attempts++
    }
    
    // Dernière tentative
    const waypoints = this.generateAlternativeWaypoints(options.start_lat, options.start_lon, radius)
    const route = await this.getRoute(waypoints, options.terrain_type)
    if (!route) return null
    
    return {
      distance: route.distance / 1000,
      duration: route.duration,
      elevation: 0,
      geometry: route.geometry
    }
  }

  /**
   * Calcule le rayon pour une distance donnée
   */
  private calculateRadius(distanceKm: number): number {
    // Pour une route circulaire, le rayon est environ distance / (2 * π)
    // Mais nous devons ajuster pour tenir compte du fait que OSRM suit les routes réelles
    // qui peuvent être plus longues que la distance à vol d'oiseau
    // Réduire encore plus pour compenser les détours urbains
    return (distanceKm / (2 * Math.PI)) * 0.3 // Réduire de 70% pour compenser les détours urbains
  }

  /**
   * Génère des waypoints pour une route circulaire
   */
  private generateCircularWaypoints(startLat: number, startLon: number, radiusKm: number): [number, number][] {
    const waypoints: [number, number][] = []
    const numPoints = 8 // Nombre de points sur le cercle
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints
      const lat = startLat + (radiusKm / 111) * Math.cos(angle) // Approximation: 1° ≈ 111km
      const lon = startLon + (radiusKm / (111 * Math.cos(startLat * Math.PI / 180))) * Math.sin(angle)
      waypoints.push([lon, lat])
    }
    
    return waypoints
  }

  /**
   * Génère des waypoints pour une route avec détours
   */
  private generateDetourWaypoints(startLat: number, startLon: number, radiusKm: number): [number, number][] {
    const waypoints: [number, number][] = []
    const numPoints = 6
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints
      const variation = radiusKm * 0.3 * Math.sin(i * Math.PI / 3) // Ajouter des variations
      const effectiveRadius = radiusKm + variation
      
      const lat = startLat + (effectiveRadius / 111) * Math.cos(angle)
      const lon = startLon + (effectiveRadius / (111 * Math.cos(startLat * Math.PI / 180))) * Math.sin(angle)
      waypoints.push([lon, lat])
    }
    
    return waypoints
  }

  /**
   * Génère des waypoints pour une route alternative
   */
  private generateAlternativeWaypoints(startLat: number, startLon: number, radiusKm: number): [number, number][] {
    const waypoints: [number, number][] = []
    const numPoints = 10
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints
      const variation = radiusKm * 0.5 * Math.cos(i * Math.PI / 5) // Variations différentes
      const effectiveRadius = radiusKm + variation
      
      const lat = startLat + (effectiveRadius / 111) * Math.cos(angle)
      const lon = startLon + (effectiveRadius / (111 * Math.cos(startLat * Math.PI / 180))) * Math.sin(angle)
      waypoints.push([lon, lat])
    }
    
    return waypoints
  }

  /**
   * Obtient une route depuis OSRM
   */
  private async getRoute(waypoints: [number, number][], terrainType: string): Promise<{
    distance: number
    duration: number
    geometry: { type: 'LineString'; coordinates: [number, number][] }
  } | null> {
    try {
      // Choisir le profil selon le type de terrain
      const profile = this.getOSRMProfile(terrainType)
      
      const coordinates = waypoints.map(wp => `${wp[1]},${wp[0]}`).join(';')
      const url = `${this.baseUrl}/route/v1/${profile}/${coordinates}`
      
      const params = new URLSearchParams({
        geometries: 'geojson',
        overview: 'full',
        steps: 'false',
        alternatives: 'false'
      })
      
      console.log(`Making OSRM request to: ${url}?${params}`)
      
      const response = await axios.get(`${url}?${params}`, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'TrailRouteGenerator/1.0'
        }
      })
      
      if (response.data.code !== 'Ok') {
        console.warn('OSRM returned error:', response.data.code)
        return null
      }
      
      const route = response.data.routes[0]
      if (!route) {
        console.warn('No route found in OSRM response')
        return null
      }
      
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry
      }
      
    } catch (error) {
      console.error('OSRM request failed:', error)
      return null
    }
  }

  /**
   * Détermine le profil OSRM selon le type de terrain
   */
  private getOSRMProfile(terrainType: string): string {
    switch (terrainType) {
      case 'paved':
        return 'driving' // Routes pavées
      case 'unpaved':
        return 'foot' // Sentiers non pavés
      case 'mixed':
      default:
        return 'foot' // Mixte, privilégier la marche
    }
  }

  /**
   * Génère un nom de route
   */
  private getRouteName(terrainType: string, distance: number): string {
    const terrainNames = {
      paved: 'Paved Route',
      unpaved: 'Trail Route',
      mixed: 'Mixed Route'
    }
    
    return `${terrainNames[terrainType as keyof typeof terrainNames]} - ${distance.toFixed(1)}km`
  }

  /**
   * Génère une description de route
   */
  private getRouteDescription(terrainType: string, distance: number, elevation: number, difficulty: string): string {
    const terrainDescriptions = {
      paved: 'Route sur routes pavées',
      unpaved: 'Sentier en terre',
      mixed: 'Route mixte avec sections pavées et non pavées'
    }
    
    return `${terrainDescriptions[terrainType as keyof typeof terrainDescriptions]} de ${distance.toFixed(1)}km. Dénivelé: ${elevation}m. Difficulté: ${difficulty}.`
  }
}

export const osrmService = new OSRMService()
